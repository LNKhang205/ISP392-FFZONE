package com.ffzone.ffzone_backend.repository;

import com.ffzone.ffzone_backend.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CartItemRepository extends JpaRepository<CartItem, UUID> {
    List<CartItem> findByCartId(UUID cartId);
    Optional<CartItem> findByCartIdAndServiceId(UUID cartId, UUID serviceId);
    void deleteByCartId(UUID cartId);
}
