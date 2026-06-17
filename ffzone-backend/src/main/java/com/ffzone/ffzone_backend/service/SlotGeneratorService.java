package com.ffzone.ffzone_backend.service;
 
import com.ffzone.ffzone_backend.entity.Field;
import com.ffzone.ffzone_backend.entity.FieldPricing;
import com.ffzone.ffzone_backend.entity.FieldSlot;
import com.ffzone.ffzone_backend.enums.FieldStatus;
import com.ffzone.ffzone_backend.enums.SlotStatus;
import com.ffzone.ffzone_backend.repository.FieldPricingRepository;
import com.ffzone.ffzone_backend.repository.FieldRepository;
import com.ffzone.ffzone_backend.repository.FieldSlotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
 
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;
 
/**
 * Chuyên generate slot.
 * - generateForAllFields()  : KHÔNG @Transactional, loop ngoài → mỗi field gọi generateForField()
 * - generateForField()      : @Transactional → tx nhỏ, commit xong trả connection pool ngay
 *
 * FIX: Wraps calculateBasePriceFromCache per-slot in try/catch so a pricing
 * exception never aborts the whole batch. Falls back to hardcoded defaults.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SlotGeneratorService {
 
    private final FieldSlotRepository    slotRepository;
    private final FieldRepository        fieldRepository;
    private final FieldPricingRepository pricingRepository;
    private final FieldSlotService       fieldSlotService;
 
    private static final int       PLAY_MINUTES  = 60;
    private static final int       SLOT_STEP     = 75;   // 60 play + 15 break
    private static final LocalTime DEFAULT_START = LocalTime.of(5, 0);
    private static final LocalTime DEFAULT_END   = LocalTime.of(23, 45);
 
    // Last slot start = 22:30 → endTime = 23:30. 15 slots total: 05:00…22:30 (step 75min).
    // Hardcoded to avoid LocalTime midnight-wrap bug (never do arithmetic that crosses 00:00).
    private static final LocalTime LAST_START    = LocalTime.of(22, 30);
 
    // Hardcoded fallback prices (weekday)
    private static final BigDecimal FALLBACK_5V5  = new BigDecimal("200000");
    private static final BigDecimal FALLBACK_7V7  = new BigDecimal("240000");
    private static final BigDecimal FALLBACK_9V9  = new BigDecimal("300000");
    private static final BigDecimal WEEKEND_MULT  = new BigDecimal("1.25");
 
    // ── Entry points ─────────────────────────────────────────────────────────
 
    /** Gọi từ SlotScheduler: generate tất cả sân cho 1 ngày. Không giữ connection lâu. */
    public void generateForAllFields(LocalDate date) {
        List<Field> activeFields = fieldRepository.findByStatus(FieldStatus.ACTIVE);
        log.info("[SlotGenerator] Generate {} sân on {}", activeFields.size(), date);
 
        Map<UUID, List<FieldPricing>> pricingByField = loadPricingByField(activeFields);
 
        for (Field field : activeFields) {
            try {
                generateForField(field, date, pricingByField.getOrDefault(field.getId(), List.of()));
            } catch (Exception e) {
                log.error("[SlotGenerator] Lỗi sân '{}' ngày {}: {}", field.getName(), date, e.getMessage(), e);
            }
        }
    }
 
    /** Gọi từ FieldService khi tạo sân mới: generate 1 sân cho 1 ngày cụ thể. */
    public void generateForField(Field field, LocalDate date) {
        List<FieldPricing> pricings = pricingRepository.findByFieldIdAndIsActive(field.getId(), true);
        generateForField(field, date, pricings);
    }
 
    // ── Core: 1 tx nhỏ cho 1 field + 1 ngày ─────────────────────────────────
 
    @Transactional
    public void generateForField(Field field, LocalDate date, List<FieldPricing> pricings) {
        // Skip past dates
        if (date.isBefore(LocalDate.now())) {
            log.info("[SlotGenerator] Bỏ qua ngày quá khứ {} cho sân '{}'", date, field.getName());
            return;
        }
 
        // Skip if slots already exist for this field+date
        if (slotRepository.existsByFieldIdAndSlotDate(field.getId(), date)) {
            log.info("[SlotGenerator] Slots đã tồn tại cho sân '{}' ngày {} — bỏ qua", field.getName(), date);
            return;
        }
 
        log.info("[SlotGenerator] Generating slots for field '{}'", field.getName());
 
        List<FieldSlot> toSave = new ArrayList<>();
        LocalTime cursor = DEFAULT_START;
 
        // CRITICAL: Do NOT use cursor.plusMinutes(PLAY_MINUTES).isAfter(DEFAULT_END).
        // LocalTime wraps around midnight — e.g. 23:45+75min = 00:45 which is NOT
        // after 23:45, causing an infinite loop. Compare cursor against LAST_START instead.
        while (!cursor.isAfter(LAST_START)) {
            log.info("[SlotGenerator] Start {}", cursor);
 
            BigDecimal price = resolvePrice(field, date, cursor, pricings);
            log.info("[SlotGenerator] Price {}", price);
 
            toSave.add(FieldSlot.builder()
                    .field(field)
                    .slotDate(date)
                    .startTime(cursor)
                    .endTime(cursor.plusMinutes(PLAY_MINUTES))
                    .price(price)
                    .status(SlotStatus.AVAILABLE)
                    .build());
 
            cursor = cursor.plusMinutes(SLOT_STEP);
        }
 
        log.info("[SlotGenerator] toSave.size() = {}", toSave.size());
 
        if (!toSave.isEmpty()) {
            slotRepository.saveAll(toSave);
            log.info("[SlotGenerator] Created {} slots - sân '{}' ngày {}", toSave.size(), field.getName(), date);
        } else {
            log.warn("[SlotGenerator] toSave rỗng cho sân '{}' ngày {} — không có slot nào được tạo", field.getName(), date);
        }
    }
 
    // ── Price resolution with fallback ───────────────────────────────────────
 
    /**
     * Tries to get the price via FieldSlotService. If that throws for any reason
     * (no pricing data, NPE, etc.) falls back to hardcoded defaults so slot
     * generation always continues.
     */
    private BigDecimal resolvePrice(Field field, LocalDate date, LocalTime startTime,
                                    List<FieldPricing> pricings) {
        try {
            BigDecimal price = fieldSlotService.calculateBasePriceFromCache(field, date, startTime, pricings);
            if (price != null) return price;
            log.warn("[SlotGenerator] calculateBasePriceFromCache trả null cho sân '{}' lúc {} — dùng fallback",
                    field.getName(), startTime);
        } catch (Exception e) {
            log.error("[SlotGenerator] Failed to calculate price cho sân '{}' lúc {}: {} — dùng fallback",
                    field.getName(), startTime, e.getMessage());
        }
        return fallbackPrice(field, date);
    }
 
    /**
     * Hardcoded default: 5v5=200k, 7v7=240k, 9v9=300k.
     * Weekend = weekday × 1.25, rounded up.
     */
    private BigDecimal fallbackPrice(Field field, LocalDate date) {
        BigDecimal weekday;
        if (field.getType() == null) {
            weekday = FALLBACK_5V5;
        } else {
            weekday = switch (field.getType()) {
                case FIVE_VS_FIVE   -> FALLBACK_5V5;
                case SEVEN_VS_SEVEN -> FALLBACK_7V7;
                case NINE_VS_NINE   -> FALLBACK_9V9;
            };
        }
        boolean weekend = isWeekend(date);
        if (weekend) {
            return weekday.multiply(WEEKEND_MULT).setScale(0, RoundingMode.CEILING);
        }
        return weekday;
    }
 
    private boolean isWeekend(LocalDate date) {
        return switch (date.getDayOfWeek()) {
            case SATURDAY, SUNDAY -> true;
            default -> false;
        };
    }
 
    // ── Helper ───────────────────────────────────────────────────────────────
 
    private Map<UUID, List<FieldPricing>> loadPricingByField(List<Field> fields) {
        Set<UUID> fieldIds = fields.stream().map(Field::getId).collect(Collectors.toSet());
        return pricingRepository.findByIsActive(true).stream()
                .filter(p -> fieldIds.contains(p.getField().getId()))
                .collect(Collectors.groupingBy(p -> p.getField().getId()));
    }
}