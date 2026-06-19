package com.ffzone.ffzone_backend.dto.response;

import com.ffzone.ffzone_backend.entity.CartItem;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data @Builder
public class CartItemResponse {
    private UUID id;
    private UUID serviceId;
    private String serviceName;
    private String serviceCategory;
    private String imageUrl;
    private BigDecimal unitPrice;
    private Integer quantity;
    private BigDecimal subtotal;

    public static CartItemResponse from(CartItem item) {
        return CartItemResponse.builder()
            .id(item.getId())
            .serviceId(item.getService().getId())
            .serviceName(item.getService().getName())
            .serviceCategory(item.getService().getCategory().name())
            .imageUrl(item.getService().getImageUrl())
            .unitPrice(item.getService().getPrice())
            .quantity(item.getQuantity())
            .subtotal(item.getSubtotal())
            .build();
    }
}
