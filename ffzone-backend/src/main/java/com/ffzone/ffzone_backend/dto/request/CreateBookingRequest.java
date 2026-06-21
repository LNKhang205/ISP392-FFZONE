package com.ffzone.ffzone_backend.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * Request tạo booking mới.
 * - fieldSlotIds: 1–3 slot liên tiếp (BR-25), cùng 1 sân.
 * - voucherCode: tùy chọn, validate ở BookingService.
 * Services KHÔNG gửi ở đây — thêm sau qua BookingItemController
 * (POST /api/bookings/{id}/services/checkout-cart hoặc /services).
 */
@Data
public class CreateBookingRequest {

    @NotNull
    private UUID fieldId;

    @NotEmpty
    private List<UUID> fieldSlotIds;

    /** Mã voucher, có thể null/blank nếu không áp dụng */
    private String voucherCode;

    private String note;
}
