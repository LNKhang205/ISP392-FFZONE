package com.ffzone.ffzone_backend.repository;

import com.ffzone.ffzone_backend.entity.Booking;
import com.ffzone.ffzone_backend.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {
    Optional<Booking> findByBookingCode(String bookingCode);
    List<Booking> findByAccountId(UUID accountId);
    List<Booking> findByAccountIdOrderByCreatedAtDesc(UUID accountId);
    List<Booking> findByStatus(BookingStatus status);

    @Query("SELECT b FROM Booking b WHERE b.status = 'PENDING_PAYMENT' AND b.paymentDeadline < :now")
    List<Booking> findExpiredPendingBookings(@Param("now") LocalDateTime now);
}
