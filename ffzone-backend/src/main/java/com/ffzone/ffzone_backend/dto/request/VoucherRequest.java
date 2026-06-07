package com.ffzone.ffzone_backend.dto.request;

import com.ffzone.ffzone_backend.enums.VoucherType;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class VoucherRequest {
    private String code;
    private VoucherType voucherType;
    private BigDecimal discountValue;
    private Integer quantity;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
}
