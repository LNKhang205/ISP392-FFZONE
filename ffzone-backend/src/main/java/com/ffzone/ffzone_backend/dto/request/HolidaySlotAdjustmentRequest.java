package com.ffzone.ffzone_backend.dto.request;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class HolidaySlotAdjustmentRequest {
    private List<UUID> fieldIds;
    private LocalDate fromDate;
    private LocalDate toDate;
    private BigDecimal adjustmentPercent;
}
