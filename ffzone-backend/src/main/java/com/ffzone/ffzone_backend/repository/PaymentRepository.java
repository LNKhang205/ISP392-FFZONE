package com.ffzone.ffzone_backend.repository;

import com.ffzone.ffzone_backend.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByBookingId(UUID bookingId);
    Optional<Payment> findByVnpTxnRef(String vnpTxnRef);
}
