package com.ffzone.ffzone_backend.dto.response;

import com.ffzone.ffzone_backend.entity.UserVoucher;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class UserVoucherResponse {
    private UUID id;
    private UUID voucherId;
    private String code;
    private String voucherType;
    private BigDecimal discountValue;
    private LocalDateTime endDate;
    private Boolean isUsed;
    private LocalDateTime claimedAt;

    public static UserVoucherResponse from(UserVoucher uv) {
        return UserVoucherResponse.builder()
            .id(uv.getId())
            .voucherId(uv.getVoucher().getId())
            .code(uv.getVoucher().getCode())
            .voucherType(uv.getVoucher().getVoucherType().name())
            .discountValue(uv.getVoucher().getDiscountValue())
            .endDate(uv.getVoucher().getEndDate())
            .isUsed(uv.getIsUsed())
            .claimedAt(uv.getClaimedAt())
            .build();
    }
}