package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.request.FieldPricingRequest;
import com.ffzone.ffzone_backend.dto.response.FieldPricingResponse;
import com.ffzone.ffzone_backend.entity.Field;
import com.ffzone.ffzone_backend.entity.FieldPricing;
import com.ffzone.ffzone_backend.enums.FieldType;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.FieldPricingRepository;
import com.ffzone.ffzone_backend.repository.FieldRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FieldPricingService {

    private final FieldPricingRepository pricingRepository;
    private final FieldRepository        fieldRepository;
    private final FieldService           fieldService;

    private static final LocalTime DEFAULT_OPEN  = LocalTime.of(5, 0);
    private static final LocalTime DEFAULT_CLOSE = LocalTime.of(23, 0);

    // ════════════════════════════════════════════════════════════
    // CÁC METHOD CŨ — GIỮ NGUYÊN, KHÔNG BREAKING CHANGE
    // ════════════════════════════════════════════════════════════

    public List<FieldPricingResponse> findByField(UUID fieldId) {
        return pricingRepository.findByFieldIdAndIsActive(fieldId, true)
                .stream().map(FieldPricingResponse::from).toList();
    }

    public FieldPricingResponse findById(UUID id) {
        return FieldPricingResponse.from(getOrThrow(id));
    }

    @Transactional
    public FieldPricingResponse create(FieldPricingRequest req) {
        FieldPricing pricing = FieldPricing.builder()
                .field(fieldService.getOrThrow(req.getFieldId()))
                .price(req.getPrice())
                .dayOfWeek(req.getDayOfWeek())
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .effectiveFrom(req.getEffectiveFrom())
                .effectiveTo(req.getEffectiveTo())
                .isActive(true)
                .build();
        return FieldPricingResponse.from(pricingRepository.save(pricing));
    }

    @Transactional
    public FieldPricingResponse update(UUID id, FieldPricingRequest req) {
        FieldPricing pricing = getOrThrow(id);
        if (req.getPrice()         != null) pricing.setPrice(req.getPrice());
        if (req.getDayOfWeek()     != null) pricing.setDayOfWeek(req.getDayOfWeek());
        if (req.getStartTime()     != null) pricing.setStartTime(req.getStartTime());
        if (req.getEndTime()       != null) pricing.setEndTime(req.getEndTime());
        if (req.getEffectiveFrom() != null) pricing.setEffectiveFrom(req.getEffectiveFrom());
        if (req.getEffectiveTo()   != null) pricing.setEffectiveTo(req.getEffectiveTo());
        if (req.getIsActive()      != null) pricing.setIsActive(req.getIsActive());
        return FieldPricingResponse.from(pricingRepository.save(pricing));
    }

    @Transactional
    public void delete(UUID id) {
        getOrThrow(id);
        pricingRepository.deleteById(id);
    }

    // ════════════════════════════════════════════════════════════
    // METHOD MỚI
    // ════════════════════════════════════════════════════════════

    /**
     * Lấy tất cả pricing của tất cả sân (admin xem tổng).
     */
    public List<FieldPricingResponse> findAll() {
        return pricingRepository.findAll()
                .stream().map(FieldPricingResponse::from).toList();
    }

    /**
     * Lấy chỉ các bản ghi HOLIDAY đang active.
     */
    public List<FieldPricingResponse> findAllHolidays() {
        return pricingRepository.findAll().stream()
                .filter(p -> "HOLIDAY".equals(p.getDayOfWeek())
                          && Boolean.TRUE.equals(p.getIsActive()))
                .map(FieldPricingResponse::from)
                .toList();
    }

    /**
     * Tạo hoặc cập nhật giá bình thường cho 1 sân.
     * Tự tạo 2 bản ghi: WEEKDAY + WEEKEND.
     * Weekend = weekdayPrice × 1.25 làm tròn lên 1000đ.
     * Deactivate bản ghi WEEKDAY / WEEKEND cũ (giữ HOLIDAY).
     */
    @Transactional
    public List<FieldPricingResponse> createOrUpdate(UUID fieldId, FieldPricingRequest req) {
        if (req.getWeekdayPrice() == null)
            throw AppException.badRequest("Vui lòng nhập giá ngày thường (weekdayPrice)");

        Field field       = getFieldOrThrow(fieldId);
        BigDecimal wd     = req.getWeekdayPrice();
        BigDecimal we     = calcWeekend(wd);
        LocalTime  open   = req.getStartTime()     != null ? req.getStartTime()     : DEFAULT_OPEN;
        LocalTime  close  = req.getEndTime()        != null ? req.getEndTime()       : DEFAULT_CLOSE;
        LocalDate  from   = req.getEffectiveFrom()  != null ? req.getEffectiveFrom() : LocalDate.now();
        LocalDate  to     = req.getEffectiveTo();

        // Deactivate WEEKDAY + WEEKEND cũ; giữ nguyên HOLIDAY
        deactivateByType(fieldId, "WEEKDAY");
        deactivateByType(fieldId, "WEEKEND");

        // Tạo mới WEEKDAY
        FieldPricing wdPricing = FieldPricing.builder()
                .field(field).price(wd).dayOfWeek("WEEKDAY")
                .startTime(open).endTime(close)
                .effectiveFrom(from).effectiveTo(to).isActive(true)
                .build();

        // Tạo mới WEEKEND
        FieldPricing wePricing = FieldPricing.builder()
                .field(field).price(we).dayOfWeek("WEEKEND")
                .startTime(open).endTime(close)
                .effectiveFrom(from).effectiveTo(to).isActive(true)
                .build();

        pricingRepository.save(wdPricing);
        pricingRepository.save(wePricing);

        log.info("[Pricing] Sân {} → Ngày thường: {} | Cuối tuần: {}", field.getName(), wd, we);
        return List.of(
                FieldPricingResponse.from(wdPricing),
                FieldPricingResponse.from(wePricing)
        );
    }

    /**
     * Áp giá ngày lễ cho nhiều sân cùng lúc.
     * Tạo bản ghi HOLIDAY trong bảng field_pricing.
     * Giá lễ = giá ngày thường hiện tại × (1 + increasePercentage/100).
     *
     * Xác định sân mục tiêu:
     *   - req.fieldIds  → dùng danh sách id cụ thể
     *   - req.fieldType → lấy tất cả sân thuộc loại đó
     *   - cả hai null   → áp cho tất cả sân active
     */
    @Transactional
    public List<FieldPricingResponse> createHolidayBulk(FieldPricingRequest req) {
        if (req.getEffectiveFrom()    == null) throw AppException.badRequest("Cần effectiveFrom");
        if (req.getEffectiveTo()      == null) throw AppException.badRequest("Cần effectiveTo");
        if (req.getIncreasePercentage()== null) throw AppException.badRequest("Cần increasePercentage");
        if (req.getEffectiveTo().isBefore(req.getEffectiveFrom()))
            throw AppException.badRequest("effectiveTo phải sau effectiveFrom");

        List<Field> targets = resolveTargetFields(req);
        if (targets.isEmpty())
            throw AppException.badRequest("Không tìm thấy sân nào phù hợp");

        BigDecimal multiplier = BigDecimal.ONE.add(
                req.getIncreasePercentage().divide(new BigDecimal("100"))
        );

        LocalTime open  = req.getStartTime() != null ? req.getStartTime() : DEFAULT_OPEN;
        LocalTime close = req.getEndTime()   != null ? req.getEndTime()   : DEFAULT_CLOSE;
        String holidayName = req.getHolidayName() != null ? req.getHolidayName() : "Ngày lễ";

        List<FieldPricingResponse> results = new ArrayList<>();

        for (Field field : targets) {
            // Lấy giá ngày thường hiện tại của sân
            BigDecimal basePrice = getCurrentWeekdayPrice(field.getId());

            // Tính giá lễ = basePrice × (1 + %)
            BigDecimal holidayPrice = basePrice
                    .multiply(multiplier)
                    .divide(new BigDecimal("1000"), 0, RoundingMode.CEILING)
                    .multiply(new BigDecimal("1000"));

            FieldPricing holiday = FieldPricing.builder()
                    .field(field)
                    .price(holidayPrice)
                    .dayOfWeek("HOLIDAY")
                    .startTime(open)
                    .endTime(close)
                    .effectiveFrom(req.getEffectiveFrom())
                    .effectiveTo(req.getEffectiveTo())
                    .holidayName(holidayName)
                    .isActive(true)
                    .build();

            results.add(FieldPricingResponse.from(pricingRepository.save(holiday)));
            log.info("[Holiday] Sân {} → {} ({} × {}%)", field.getName(),
                    holidayPrice, basePrice, req.getIncreasePercentage());
        }

        return results;
    }

    // ════════════════════════════════════════════════════════════
    // HELPERS
    // ════════════════════════════════════════════════════════════

    /** weekday × 1.25, làm tròn lên đến 1000đ */
    public static BigDecimal calcWeekend(BigDecimal weekday) {
        return weekday
                .multiply(new BigDecimal("1.25"))
                .divide(new BigDecimal("1000"), 0, RoundingMode.CEILING)
                .multiply(new BigDecimal("1000"));
    }

    /** Deactivate tất cả bản ghi theo dayOfWeek của 1 sân */
    private void deactivateByType(UUID fieldId, String dayOfWeek) {
        pricingRepository.findByFieldIdAndIsActive(fieldId, true).stream()
                .filter(p -> dayOfWeek.equals(p.getDayOfWeek()))
                .forEach(p -> {
                    p.setIsActive(false);
                    pricingRepository.save(p);
                });
    }

    /**
     * Lấy giá ngày thường hiện tại của sân.
     * Nếu chưa có pricing → trả 0 (admin cần đặt giá trước).
     */
    private BigDecimal getCurrentWeekdayPrice(UUID fieldId) {
        return pricingRepository.findByFieldIdAndIsActive(fieldId, true).stream()
                .filter(p -> "WEEKDAY".equals(p.getDayOfWeek()))
                .map(FieldPricing::getPrice)
                .findFirst()
                .orElse(BigDecimal.ZERO);
    }

    /** Xác định danh sách sân mục tiêu từ request */
    private List<Field> resolveTargetFields(FieldPricingRequest req) {
        if (req.getFieldIds() != null && !req.getFieldIds().isEmpty()) {
            return req.getFieldIds().stream()
                    .map(this::getFieldOrThrow)
                    .toList();
        }
        if (req.getFieldType() != null) {
            return fieldRepository.findAll().stream()
                    .filter(f -> f.getType() == req.getFieldType())
                    .toList();
        }
        // null → tất cả sân
        return fieldRepository.findAll();
    }

    private FieldPricing getOrThrow(UUID id) {
        return pricingRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Bảng giá không tồn tại: " + id));
    }

    private Field getFieldOrThrow(UUID fieldId) {
        return fieldRepository.findById(fieldId)
                .orElseThrow(() -> AppException.notFound("Sân không tồn tại: " + fieldId));
    }
}
