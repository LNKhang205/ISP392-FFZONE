package com.ffzone.ffzone_backend.dto.response;

import com.ffzone.ffzone_backend.entity.BookingService;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data @Builder
public class BookingServiceResponse {
    private UUID id;
    private UUID serviceId;
    private String serviceName;
    private String serviceCategory;
    private String imageUrl;
    private BigDecimal unitPrice;
    private Integer quantity;
    private BigDecimal totalPrice;

    public static BookingServiceResponse from(BookingService bs) {
        return BookingServiceResponse.builder()
            .id(bs.getId())
            .serviceId(bs.getService().getId())
            .serviceName(bs.getService().getName())
            .serviceCategory(bs.getService().getCategory().name())
            .imageUrl(bs.getService().getImageUrl())
            .unitPrice(bs.getUnitPrice())
            .quantity(bs.getQuantity())
            .totalPrice(bs.getTotalPrice())
            .build();
    }
}
