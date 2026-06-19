package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.request.AddToCartRequest;
import com.ffzone.ffzone_backend.dto.response.CartResponse;
import com.ffzone.ffzone_backend.entity.*;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ServiceRepository serviceRepository;

    /** Lấy Cart của user (tạo mới nếu chưa có) */
    @Transactional
    public CartResponse getCart(Account account) {
        Cart cart = getOrCreateCart(account);
        return CartResponse.from(cart);
    }

    /** Thêm dịch vụ vào giỏ — nếu đã có thì cộng thêm số lượng */
    @Transactional
    public CartResponse addItem(Account account, AddToCartRequest req) {
        com.ffzone.ffzone_backend.entity.Service service = serviceRepository.findById(req.getServiceId())
            .orElseThrow(() -> AppException.notFound("Dịch vụ không tồn tại: " + req.getServiceId()));

        if (!service.getIsActive())
            throw AppException.badRequest("Dịch vụ hiện không khả dụng: " + service.getName());

        Cart cart = getOrCreateCart(account);

        Optional<CartItem> existing = cartItemRepository.findByCartIdAndServiceId(cart.getId(), service.getId());
        if (existing.isPresent()) {
            CartItem item = existing.get();
            item.setQuantity(item.getQuantity() + (req.getQuantity() != null ? req.getQuantity() : 1));
            cartItemRepository.save(item);
        } else {
            CartItem newItem = CartItem.builder()
                .cart(cart)
                .service(service)
                .quantity(req.getQuantity() != null ? req.getQuantity() : 1)
                .build();
            cart.getItems().add(newItem);
            cartItemRepository.save(newItem);
        }

        // Reload để lấy đủ items
        return CartResponse.from(cartRepository.findByAccountIdWithItems(account.getId()).orElse(cart));
    }

    /** Cập nhật số lượng của 1 item — quantity=0 thì xóa */
    @Transactional
    public CartResponse updateItem(Account account, UUID itemId, int quantity) {
        Cart cart = getOrCreateCart(account);
        CartItem item = cartItemRepository.findById(itemId)
            .orElseThrow(() -> AppException.notFound("CartItem không tồn tại"));

        if (!item.getCart().getId().equals(cart.getId()))
            throw AppException.forbidden("Không có quyền sửa item này");

        if (quantity <= 0) {
            cartItemRepository.delete(item);
        } else {
            item.setQuantity(quantity);
            cartItemRepository.save(item);
        }
        return CartResponse.from(cartRepository.findByAccountIdWithItems(account.getId()).orElse(cart));
    }

    /** Xóa 1 item khỏi giỏ */
    @Transactional
    public CartResponse removeItem(Account account, UUID itemId) {
        return updateItem(account, itemId, 0);
    }

    /** Làm trống giỏ hàng */
    @Transactional
    public void clearCart(Account account) {
        cartRepository.findByAccountId(account.getId()).ifPresent(cart -> {
            cart.getItems().clear();
            cartRepository.save(cart);
        });
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private Cart getOrCreateCart(Account account) {
        return cartRepository.findByAccountIdWithItems(account.getId()).orElseGet(() -> {
            Cart newCart = Cart.builder().account(account).build();
            return cartRepository.save(newCart);
        });
    }
}
