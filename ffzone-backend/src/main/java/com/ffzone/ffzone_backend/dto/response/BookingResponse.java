package com.ffzone.ffzone_backend.dto.response;

import com.ffzone.ffzone_backend.entity.Booking;
import com.ffzone.ffzone_backend.entity.BookingSlot;
import com.ffzone.ffzone_backend.enums.BookingStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
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
    private String fieldCode;

    private UUID voucherId;
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

    private List<SlotInfo> slots;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    public static class SlotInfo {
        private UUID fieldSlotId;
        private LocalDate slotDate;
        private LocalTime startTime;
        private LocalTime endTime;
        private BigDecimal bookedPrice;
    }

    public static BookingResponse from(Booking b, List<BookingSlot> bookingSlots) {
        return BookingResponse.builder()
                .id(b.getId())
                .bookingCode(b.getBookingCode())
                .accountId(b.getAccount().getId())
                .accountName(b.getAccount().getFullName())
                .fieldId(b.getField().getId())
                .fieldName(b.getField().getName())
                .fieldCode(b.getField().getCode())
                .voucherId(b.getVoucher() != null ? b.getVoucher().getId() : null)
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
                .slots(bookingSlots == null ? List.of() : bookingSlots.stream()
                        .map(bs -> SlotInfo.builder()
                                .fieldSlotId(bs.getFieldSlot().getId())
                                .slotDate(bs.getFieldSlot().getSlotDate())
                                .startTime(bs.getFieldSlot().getStartTime())
                                .endTime(bs.getFieldSlot().getEndTime())
                                .bookedPrice(bs.getBookedPrice())
                                .build())
                        .toList())
                .createdAt(b.getCreatedAt())
                .updatedAt(b.getUpdatedAt())
                .build();
    }
}
