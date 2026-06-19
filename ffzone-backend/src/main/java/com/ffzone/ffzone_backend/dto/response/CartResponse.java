package com.ffzone.ffzone_backend.dto.response;

import com.ffzone.ffzone_backend.entity.Cart;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data @Builder
public class CartResponse {
    private UUID id;
    private List<CartItemResponse> items;
    private BigDecimal total;

    public static CartResponse from(Cart cart) {
        List<CartItemResponse> items = cart.getItems().stream()
            .map(CartItemResponse::from).toList();
        BigDecimal total = items.stream()
            .map(CartItemResponse::getSubtotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return CartResponse.builder()
            .id(cart.getId())
            .items(items)
            .total(total)
            .build();
    }
}
