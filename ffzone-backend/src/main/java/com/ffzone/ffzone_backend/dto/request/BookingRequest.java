package com.ffzone.ffzone_backend.dto.request;

import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class BookingRequest {

    /** Danh sách field_slot IDs muốn đặt (1–3 slot liên tiếp, cùng sân) */
    private List<UUID> slotIds;

    /** Mã voucher (tuỳ chọn) */
    private String voucherCode;

    /** Dịch vụ thêm (tuỳ chọn) */
    private List<ServiceItem> services;

    private String note;

    @Data
    public static class ServiceItem {
        private UUID serviceId;
        private Integer quantity;
    }
}