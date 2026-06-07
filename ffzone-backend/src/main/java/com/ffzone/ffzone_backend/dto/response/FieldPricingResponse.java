package com.ffzone.ffzone_backend.dto.response;

import com.ffzone.ffzone_backend.entity.FieldPricing;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data @Builder
public class FieldPricingResponse {
    private UUID id;
    private UUID fieldId;
    private String fieldName;
    private BigDecimal price;
    private String dayOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private Boolean isActive;

    public static FieldPricingResponse from(FieldPricing p) {
        return FieldPricingResponse.builder()
            .id(p.getId()).fieldId(p.getField().getId()).fieldName(p.getField().getName())
            .price(p.getPrice()).dayOfWeek(p.getDayOfWeek())
            .startTime(p.getStartTime()).endTime(p.getEndTime())
            .effectiveFrom(p.getEffectiveFrom()).effectiveTo(p.getEffectiveTo())
            .isActive(p.getIsActive()).build();
    }
}
