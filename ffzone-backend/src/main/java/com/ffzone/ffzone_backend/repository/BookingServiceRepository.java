package com.ffzone.ffzone_backend.repository;

import com.ffzone.ffzone_backend.entity.BookingService;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingServiceRepository extends JpaRepository<BookingService, UUID> {
    @Query("SELECT bs FROM BookingService bs JOIN FETCH bs.service WHERE bs.booking.id = :bookingId")
    List<BookingService> findByBookingId(@Param("bookingId") UUID bookingId);

    @Query("SELECT bs FROM BookingService bs JOIN FETCH bs.service WHERE bs.booking.id = :bookingId AND bs.cancelledAt IS NULL")
    List<BookingService> findByBookingIdAndCancelledAtIsNull(@Param("bookingId") UUID bookingId);

    boolean existsByServiceId(UUID serviceId);
    Optional<BookingService> findByBookingIdAndServiceId(UUID bookingId, UUID serviceId);
}
