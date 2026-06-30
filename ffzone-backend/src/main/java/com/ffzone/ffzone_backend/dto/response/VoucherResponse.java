package com.ffzone.ffzone_backend.dto.response;

import com.ffzone.ffzone_backend.entity.Voucher;
import com.ffzone.ffzone_backend.enums.VoucherStatus;
import com.ffzone.ffzone_backend.enums.VoucherType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder
public class VoucherResponse {
    private UUID id;
    private String code;
    private VoucherType voucherType;
    private BigDecimal discountValue;
    private Integer quantity;
    private Integer usedQuantity;
    private Integer remaining;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private VoucherStatus status;

    public static VoucherResponse from(Voucher v) {
        VoucherStatus status = v.getStatus();
        if (status == VoucherStatus.ACTIVE && v.getEndDate().isBefore(LocalDateTime.now())) {
            status = VoucherStatus.EXPIRED;
        }
        return VoucherResponse.builder()
            .id(v.getId()).code(v.getCode()).voucherType(v.getVoucherType())
            .discountValue(v.getDiscountValue()).quantity(v.getQuantity())
            .usedQuantity(v.getUsedQuantity()).remaining(v.getQuantity() - v.getUsedQuantity())
            .startDate(v.getStartDate()).endDate(v.getEndDate()).status(status).build();
    }
}
