package com.ffzone.ffzone_backend.dto.request;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class BulkPricingRequest {
    private List<UUID> fieldIds;
    private BigDecimal weekdayPrice;
}
