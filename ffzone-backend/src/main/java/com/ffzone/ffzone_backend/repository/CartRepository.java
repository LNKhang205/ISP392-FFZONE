package com.ffzone.ffzone_backend.repository;

import com.ffzone.ffzone_backend.entity.Cart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface CartRepository extends JpaRepository<Cart, UUID> {

    Optional<Cart> findByAccountId(UUID accountId);

    @Query("SELECT c FROM Cart c LEFT JOIN FETCH c.items ci LEFT JOIN FETCH ci.service WHERE c.account.id = :accountId")
    Optional<Cart> findByAccountIdWithItems(@Param("accountId") UUID accountId);
}
