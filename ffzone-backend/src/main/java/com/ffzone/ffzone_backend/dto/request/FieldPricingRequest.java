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
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private Boolean isActive;
 
    // ── Nhận time dạng String "HH:mm" để tránh Jackson timezone shift ─────
    /** VD: "05:00" */
    private String startTime;
    /** VD: "23:30" */
    private String endTime;
 
    // ── Dùng cho createOrUpdate (endpoint mới) ────────────────
    private BigDecimal weekdayPrice;
 
    // ── Dùng cho bulk apply / holiday bulk ────────────────────
    private List<UUID> fieldIds;
    private FieldType fieldType;
 
    // ── Dùng cho holiday bulk ─────────────────────────────────
    private String holidayName;
    private BigDecimal increasePercentage;
 
    // ── Helpers parse LocalTime an toàn ───────────────────────
    public LocalTime getParsedStartTime() {
        return parseTime(startTime);
    }
 
    public LocalTime getParsedEndTime() {
        return parseTime(endTime);
    }
 
    private static LocalTime parseTime(String s) {
        if (s == null || s.isBlank()) return null;
        // Cắt bỏ seconds nếu có: "23:30:00" → "23:30"
        String trimmed = s.length() > 5 ? s.substring(0, 5) : s;
        return LocalTime.parse(trimmed);
    }
}
 