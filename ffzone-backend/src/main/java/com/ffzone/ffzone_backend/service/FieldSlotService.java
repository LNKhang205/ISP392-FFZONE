package com.ffzone.ffzone_backend.service;
 
import com.ffzone.ffzone_backend.dto.response.FieldSlotResponse;
import com.ffzone.ffzone_backend.entity.Field;
import com.ffzone.ffzone_backend.entity.FieldPricing;
import com.ffzone.ffzone_backend.entity.FieldSlot;
import com.ffzone.ffzone_backend.enums.SlotStatus;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.FieldPricingRepository;
import com.ffzone.ffzone_backend.repository.FieldRepository;
import com.ffzone.ffzone_backend.repository.FieldSlotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
 
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
 
/**
 * Chỉ chứa QUERY + BUSINESS LOGIC + PRICING HELPERS.
 * Việc generate slot đã chuyển sang SlotGeneratorService.
 * Không inject SlotGeneratorService → không circular dependency.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FieldSlotService {
 
    private final FieldSlotRepository    slotRepository;
    private final FieldRepository        fieldRepository;
    private final FieldPricingRepository pricingRepository;
 
    private static final int        PLAY_MINUTES       = 60;
    private static final int        BREAK_MINUTES      = 15;
    private static final int        SLOT_STEP          = PLAY_MINUTES + BREAK_MINUTES;
    private static final LocalTime  DEFAULT_START      = LocalTime.of(5, 0);
    private static final LocalTime  DEFAULT_END        = LocalTime.of(23, 45);
    private static final BigDecimal WEEKEND_MULTIPLIER = new BigDecimal("1.25");
    private static final BigDecimal HUNDRED            = new BigDecimal("100");
 
    // ── Query methods ────────────────────────────────────────────────────────
 
    @Transactional
    public List<FieldSlotResponse> findAllByDate(LocalDate date) {
        return slotRepository.findBySlotDateOrderByStartTime(date)
                .stream().map(FieldSlotResponse::from).toList();
    }
 
    @Transactional
    public List<FieldSlotResponse> findByFieldAndDate(UUID fieldId, LocalDate date) {
        getFieldOrThrow(fieldId);
        return slotRepository.findByFieldIdAndSlotDate(fieldId, date)
                .stream().map(FieldSlotResponse::from).toList();
    }
 
    @Transactional
    public List<FieldSlotResponse> findAvailableByFieldAndDate(UUID fieldId, LocalDate date) {
        getFieldOrThrow(fieldId);
        return slotRepository.findByFieldIdAndSlotDateAndStatus(fieldId, date, SlotStatus.AVAILABLE)
                .stream().map(FieldSlotResponse::from).toList();
    }
 
    @Transactional
    public List<FieldSlotResponse> findByFieldAndDateRange(UUID fieldId, LocalDate from, LocalDate to) {
        if (to.isAfter(from.plusDays(7))) throw AppException.badRequest("Chi xem lich toi da 7 ngay");
        getFieldOrThrow(fieldId);
        return slotRepository.findByFieldIdAndDateRange(fieldId, from, to)
                .stream().map(FieldSlotResponse::from).toList();
    }
 
    @Transactional(readOnly = true)
    public FieldSlotResponse findById(UUID id) {
        return FieldSlotResponse.from(getOrThrow(id));
    }
 
    @Transactional(readOnly = true)
    public FieldSlot getOrThrow(UUID id) {
        return slotRepository.findByIdWithFetch(id)
                .orElseThrow(() -> AppException.notFound("Slot khong ton tai: " + id));
    }
 
    // ── Sync / holiday adjustment ────────────────────────────────────────────
 
    @Transactional
    public void syncGeneratedSlotPrices(UUID fieldId) {
        syncGeneratedSlotPrices(List.of(fieldId));
    }
 
    @Transactional
    public void syncGeneratedSlotPrices(List<UUID> fieldIds) {
        if (fieldIds == null || fieldIds.isEmpty()) return;
        LocalDate from = LocalDate.now();
        LocalDate to   = from.plusDays(6);
        List<FieldSlot> slots = slotRepository.findByFieldIdsAndDateRange(fieldIds, from, to);
        slots.forEach(s -> s.setPrice(calculateBasePrice(s.getField(), s.getSlotDate(), s.getStartTime())));
        if (!slots.isEmpty()) slotRepository.saveAll(slots);
    }
 
    /**
     * Cập nhật giá các slot đã sinh trong khoảng ngày lễ.
     *
     * Logic ưu tiên:
     *  1. Luôn dùng giá từ field_pricing HOLIDAY đang active trong khoảng ngày đó
     *     (calculateBasePrice đã xử lý ưu tiên HOLIDAY > WEEKEND > WEEKDAY).
     *  2. adjustmentPercent chỉ dùng như fallback khi sân chưa có pricing HOLIDAY
     *     (ví dụ slot được áp trước khi holiday pricing được lưu — trường hợp hiếm).
     *
     * Khi gọi từ PricingManagement sau khi đã lưu holiday pricing:
     *  → calculateBasePrice sẽ tự tìm thấy HOLIDAY record và trả giá đúng.
     *  → adjustmentPercent có thể truyền 0, không ảnh hưởng.
     */
    @Transactional
    public int applyHolidayAdjustment(List<UUID> fieldIds, LocalDate from, LocalDate to,
                                      BigDecimal adjustmentPercent) {
        if (fieldIds == null || fieldIds.isEmpty())
            throw AppException.badRequest("Vui long chon san");
        if (from == null || to == null || to.isBefore(from))
            throw AppException.badRequest("Khoang ngay khong hop le");
 
        List<FieldSlot> slots = slotRepository.findByFieldIdsAndDateRange(fieldIds, from, to);
 
        // Cache pricing per field để tránh N+1 query
        Map<UUID, List<FieldPricing>> pricingCache = new HashMap<>();
        for (UUID fid : fieldIds) {
            pricingCache.put(fid, pricingRepository.findByFieldIdAndIsActive(fid, true));
        }
 
        slots.forEach(slot -> {
            UUID fid = slot.getField().getId();
            List<FieldPricing> fieldPricings = pricingCache.get(fid);
 
            BigDecimal correctPrice;
            if (fieldPricings != null && !fieldPricings.isEmpty()) {
                // Tính giá dựa trên field_pricing — HOLIDAY được ưu tiên cao nhất
                correctPrice = calculateBasePriceFromCache(
                        slot.getField(), slot.getSlotDate(), slot.getStartTime(), fieldPricings
                );
            } else if (adjustmentPercent != null && adjustmentPercent.compareTo(BigDecimal.ZERO) > 0) {
                // Fallback: nhân % lên giá hiện tại của slot
                BigDecimal multiplier = BigDecimal.ONE.add(
                        adjustmentPercent.divide(HUNDRED, 4, RoundingMode.HALF_UP));
                correctPrice = roundUp(slot.getPrice().multiply(multiplier));
            } else {
                // Không có thông tin → giữ nguyên giá slot
                correctPrice = slot.getPrice();
            }
 
            slot.setPrice(correctPrice);
        });
 
        if (!slots.isEmpty()) slotRepository.saveAll(slots);
        log.info("[HolidaySync] Đã cập nhật {} slot trong khoảng {} → {}", slots.size(), from, to);
        return slots.size();
    }
 
    // ── Pricing helpers (public — dùng bởi SlotGeneratorService) ────────────
 
    public BigDecimal calculateBasePrice(Field field, LocalDate date, LocalTime startTime) {
        List<FieldPricing> pricings = pricingRepository.findByFieldIdAndIsActive(field.getId(), true);
        return calculateBasePriceFromCache(field, date, startTime, pricings);
    }
 
    public BigDecimal calculateBasePriceFromCache(Field field, LocalDate date, LocalTime startTime,
                                                   List<FieldPricing> allPricings) {
        boolean weekend = isWeekend(date);
        List<FieldPricing> active = allPricings.stream()
                .filter(p -> isInEffectivePeriod(p, date))
                .filter(p -> containsTime(p, startTime))
                .toList();
 
        // HOLIDAY có ưu tiên cao nhất — check trước WEEKDAY/WEEKEND
        FieldPricing holiday = findByDay(active, "HOLIDAY");
        if (holiday != null) return holiday.getPrice();
 
        FieldPricing direct = findByDay(active, weekend ? "WEEKEND" : "WEEKDAY");
        if (direct != null) return direct.getPrice();
 
        FieldPricing weekday = findByDay(active, "WEEKDAY");
        if (weekend && weekday != null) return calculateWeekendPrice(weekday.getPrice());
 
        BigDecimal defaultWeekday = defaultWeekdayPrice(field);
        return weekend ? calculateWeekendPrice(defaultWeekday) : defaultWeekday;
    }
 
    public BigDecimal defaultWeekdayPrice(Field field) {
        if (field.getType() == null) return new BigDecimal("200000");
        return switch (field.getType()) {
            case FIVE_VS_FIVE   -> new BigDecimal("200000");
            case SEVEN_VS_SEVEN -> new BigDecimal("240000");
            case NINE_VS_NINE   -> new BigDecimal("300000");
        };
    }
 
    public BigDecimal calculateWeekendPrice(BigDecimal weekdayPrice) {
        return roundUp(weekdayPrice.multiply(WEEKEND_MULTIPLIER));
    }
 
    // ── Private utils ────────────────────────────────────────────────────────
 
    private BigDecimal roundUp(BigDecimal price) {
        return price.setScale(0, RoundingMode.CEILING);
    }
 
    private boolean isWeekend(LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        return day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY;
    }
 
    private FieldPricing findByDay(List<FieldPricing> pricings, String dayType) {
        return pricings.stream().filter(p -> matchesDay(p, dayType)).findFirst().orElse(null);
    }
 
    private boolean containsTime(FieldPricing pricing, LocalTime startTime) {
        return !pricing.getStartTime().isAfter(startTime) && pricing.getEndTime().isAfter(startTime);
    }
 
    private boolean isInEffectivePeriod(FieldPricing pricing, LocalDate date) {
        if (pricing.getEffectiveFrom() != null && date.isBefore(pricing.getEffectiveFrom())) return false;
        if (pricing.getEffectiveTo()   != null && date.isAfter(pricing.getEffectiveTo()))    return false;
        return true;
    }
 
    private boolean matchesDay(FieldPricing pricing, String dayType) {
        String d = pricing.getDayOfWeek();
        if (d == null || d.isBlank() || "ALL".equalsIgnoreCase(d)) return true;
        return d.equalsIgnoreCase(dayType);
    }
 
    private Field getFieldOrThrow(UUID fieldId) {
        return fieldRepository.findById(fieldId)
                .orElseThrow(() -> AppException.notFound("San khong ton tai: " + fieldId));
    }
}