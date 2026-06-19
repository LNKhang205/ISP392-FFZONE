package com.ffzone.ffzone_backend.controller;

import com.ffzone.ffzone_backend.dto.request.AddToCartRequest;
import com.ffzone.ffzone_backend.dto.response.CartResponse;
import com.ffzone.ffzone_backend.entity.Account;
import com.ffzone.ffzone_backend.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    /** Lấy giỏ hàng hiện tại */
    @GetMapping
    public ResponseEntity<CartResponse> getCart(@AuthenticationPrincipal Account account) {
        return ResponseEntity.ok(cartService.getCart(account));
    }

    /** Thêm dịch vụ vào giỏ */
    @PostMapping("/items")
    public ResponseEntity<CartResponse> addItem(
            @AuthenticationPrincipal Account account,
            @Valid @RequestBody AddToCartRequest req) {
        return ResponseEntity.ok(cartService.addItem(account, req));
    }

    /** Cập nhật số lượng item */
    @PutMapping("/items/{itemId}")
    public ResponseEntity<CartResponse> updateItem(
            @AuthenticationPrincipal Account account,
            @PathVariable UUID itemId,
            @RequestParam int quantity) {
        return ResponseEntity.ok(cartService.updateItem(account, itemId, quantity));
    }

    /** Xóa 1 item */
    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<CartResponse> removeItem(
            @AuthenticationPrincipal Account account,
            @PathVariable UUID itemId) {
        return ResponseEntity.ok(cartService.removeItem(account, itemId));
    }

    /** Xóa toàn bộ giỏ */
    @DeleteMapping
    public ResponseEntity<Void> clearCart(@AuthenticationPrincipal Account account) {
        cartService.clearCart(account);
        return ResponseEntity.noContent().build();
    }
}
