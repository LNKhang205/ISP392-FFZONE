package com.ffzone.ffzone_backend.repository;

import com.ffzone.ffzone_backend.entity.BookingSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BookingSlotRepository extends JpaRepository<BookingSlot, UUID> {
    List<BookingSlot> findByBookingId(UUID bookingId);
    boolean existsByFieldSlotId(UUID fieldSlotId);
    void deleteByBookingId(UUID bookingId);
}
