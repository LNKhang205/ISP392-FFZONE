package com.ffzone.ffzone_backend.dto.response;

import com.ffzone.ffzone_backend.entity.Booking;
import com.ffzone.ffzone_backend.enums.BookingStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class BookingResponse {

    private UUID id;
    private String bookingCode;

    private UUID accountId;
    private String accountName;

    private UUID fieldId;
    private String fieldName;

    private String voucherCode;

    private BookingStatus status;

    private BigDecimal fieldAmount;
    private BigDecimal serviceAmount;
    private BigDecimal compensationAmount;
    private BigDecimal discountAmount;
    private BigDecimal totalAmount;

    private LocalDateTime paymentDeadline;
    private LocalDateTime checkinAt;
    private LocalDateTime checkoutAt;
    private String note;
    private LocalDateTime createdAt;

    /** Được gắn thêm bởi service (không map từ entity trực tiếp) */
    private List<SlotInfo> slots;
    private List<ServiceInfo> services;

    // ── nested DTOs ──────────────────────────────────────────────────────────

    @Data @Builder
    public static class SlotInfo {
        private UUID slotId;
        private String slotDate;    // yyyy-MM-dd
        private String startTime;   // HH:mm
        private String endTime;
        private BigDecimal bookedPrice;
    }

    @Data @Builder
    public static class ServiceInfo {
        private UUID bookingServiceId;
        private UUID serviceId;
        private String serviceName;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
    }

    // ── factory ──────────────────────────────────────────────────────────────

    /** Chuyển entity → DTO (không bao gồm slots/services — service sẽ gắn sau) */
    public static BookingResponse from(Booking b) {
        return BookingResponse.builder()
            .id(b.getId())
            .bookingCode(b.getBookingCode())
            .accountId(b.getAccount().getId())
            .accountName(b.getAccount().getFullName())
            .fieldId(b.getField().getId())
            .fieldName(b.getField().getName())
            .voucherCode(b.getVoucher() != null ? b.getVoucher().getCode() : null)
            .status(b.getStatus())
            .fieldAmount(b.getFieldAmount())
            .serviceAmount(b.getServiceAmount())
            .compensationAmount(b.getCompensationAmount())
            .discountAmount(b.getDiscountAmount())
            .totalAmount(b.getTotalAmount())
            .paymentDeadline(b.getPaymentDeadline())
            .checkinAt(b.getCheckinAt())
            .checkoutAt(b.getCheckoutAt())
            .note(b.getNote())
            .createdAt(b.getCreatedAt())
            .build();
    }
}