package com.ffzone.ffzone_backend.dto.response;

import com.ffzone.ffzone_backend.entity.FieldPricing;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
public class FieldPricingResponse {

    private UUID id;
    private UUID fieldId;
    private String fieldName;
    private String fieldType;       // "5V5" | "7V7" | "9V9"

    // Loại ngày
    private String dayOfWeek;       // WEEKDAY | WEEKEND | HOLIDAY

    // Giá thực tế của bản ghi
    private BigDecimal price;

    // Tiện ích cho FE — chỉ có giá trị khi dayOfWeek = WEEKDAY
    private BigDecimal weekdayPrice;
    private BigDecimal weekendPrice; // = weekdayPrice × 1.25, làm tròn lên 1000đ

    private LocalTime startTime;
    private LocalTime endTime;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    @JsonProperty("isActive")
    private Boolean isActive;

    // Chỉ có giá trị khi dayOfWeek = HOLIDAY
    private String holidayName;

    public static FieldPricingResponse from(FieldPricing p) {
        BigDecimal weekdayPrice = null;
        BigDecimal weekendPrice = null;

        if ("WEEKDAY".equals(p.getDayOfWeek())) {
            weekdayPrice = p.getPrice();
            weekendPrice = calcWeekend(p.getPrice());
        }

        String typeVal = p.getField() != null && p.getField().getType() != null
                ? p.getField().getType().getDbValue()
                : null;

        return FieldPricingResponse.builder()
                .id(p.getId())
                .fieldId(p.getField() != null ? p.getField().getId() : null)
                .fieldName(p.getField() != null ? p.getField().getName() : null)
                .fieldType(typeVal)
                .dayOfWeek(p.getDayOfWeek())
                .price(p.getPrice())
                .weekdayPrice(weekdayPrice)
                .weekendPrice(weekendPrice)
                .startTime(p.getStartTime())
                .endTime(p.getEndTime())
                .effectiveFrom(p.getEffectiveFrom())
                .effectiveTo(p.getEffectiveTo())
                .isActive(p.getIsActive())
                .holidayName(p.getHolidayName())
                .build();
    }

    /** weekday × 1.25, làm tròn lên đến 1000đ */
    public static BigDecimal calcWeekend(BigDecimal weekday) {
        if (weekday == null) return null;
        return weekday
                .multiply(new BigDecimal("1.25"))
                .divide(new BigDecimal("1000"), 0, RoundingMode.CEILING)
                .multiply(new BigDecimal("1000"));
    }
}