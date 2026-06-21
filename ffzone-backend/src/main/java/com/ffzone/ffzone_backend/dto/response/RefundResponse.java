package com.ffzone.ffzone_backend.dto.response;

import com.ffzone.ffzone_backend.entity.Refund;
import com.ffzone.ffzone_backend.enums.CancelReasonType;
import com.ffzone.ffzone_backend.enums.RefundStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class RefundResponse {

    private UUID id;
    private UUID bookingId;
    private String bookingCode;

    private UUID accountId;
    private String accountName;
    private String accountPhone;

    private CancelReasonType cancelType;
    private Integer refundPercent;
    private BigDecimal refundAmount;
    private RefundStatus status;

    private LocalDateTime requestedAt;
    private String processedByName;
    private LocalDateTime processedAt;
    private String note;

    public static RefundResponse from(Refund r) {
        return RefundResponse.builder()
                .id(r.getId())
                .bookingId(r.getBooking().getId())
                .bookingCode(r.getBooking().getBookingCode())
                .accountId(r.getBooking().getAccount().getId())
                .accountName(r.getBooking().getAccount().getFullName())
                .accountPhone(r.getBooking().getAccount().getPhone())
                .cancelType(r.getCancelType())
                .refundPercent(r.getRefundPercent())
                .refundAmount(r.getRefundAmount())
                .status(r.getStatus())
                .requestedAt(r.getRequestedAt())
                .processedByName(r.getProcessedBy() != null ? r.getProcessedBy().getFullName() : null)
                .processedAt(r.getProcessedAt())
                .note(r.getNote())
                .build();
    }
}
