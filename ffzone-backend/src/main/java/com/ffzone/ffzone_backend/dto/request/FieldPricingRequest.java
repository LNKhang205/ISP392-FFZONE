package com.ffzone.ffzone_backend.dto.request;

import com.ffzone.ffzone_backend.enums.FieldType;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
public class FieldPricingRequest {

    // ── Dùng cho create/update thông thường (endpoint cũ) ─────
    private UUID fieldId;
    private BigDecimal price;
    private String dayOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private Boolean isActive;

    // ── Dùng cho createOrUpdate (endpoint mới) ────────────────
    /** Giá ngày thường. Weekend tự tính = weekdayPrice × 1.25. */
    private BigDecimal weekdayPrice;

    // ── Dùng cho bulk apply / holiday bulk ────────────────────
    /** Danh sách fieldId cụ thể. */
    private List<UUID> fieldIds;

    /** Loại sân (5V5 / 7V7 / 9V9) — thay thế cho fieldIds khi bulk. */
    private FieldType fieldType;

    // ── Dùng cho holiday bulk ─────────────────────────────────
    /** Tên dịp lễ, VD: "Tết Nguyên Đán", "Quốc khánh 2/9". */
    private String holidayName;

    /** Phần trăm tăng giá so với giá ngày thường, VD: 50 = +50%. */
    private BigDecimal increasePercentage;
}
