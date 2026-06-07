package com.ffzone.ffzone_backend.repository;

import com.ffzone.ffzone_backend.entity.Refund;
import com.ffzone.ffzone_backend.enums.RefundStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefundRepository extends JpaRepository<Refund, UUID> {
    Optional<Refund> findByBookingId(UUID bookingId);
    List<Refund> findByStatus(RefundStatus status);
}
