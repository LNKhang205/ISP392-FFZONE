package com.ffzone.ffzone_backend.repository;

import com.ffzone.ffzone_backend.entity.BookingService;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingServiceRepository extends JpaRepository<BookingService, UUID> {
    List<BookingService> findByBookingId(UUID bookingId);
    List<BookingService> findByBookingIdAndCancelledAtIsNull(UUID bookingId);
    boolean existsByServiceId(UUID serviceId);
    Optional<BookingService> findByBookingIdAndServiceId(UUID bookingId, UUID serviceId);
}
