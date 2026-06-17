package com.ffzone.ffzone_backend.scheduler;

import com.ffzone.ffzone_backend.service.BookingManagementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BookingScheduler {

    private final BookingManagementService bookingService;

    /**
     * Chạy mỗi 1 phút.
     * Tìm các booking PENDING_PAYMENT đã quá payment_deadline → tự động huỷ
     * và giải phóng slot về AVAILABLE.
     */
    @Scheduled(fixedDelay = 60_000)
    public void expireOverdueBookings() {
        log.debug("BookingScheduler: checking expired bookings...");
        bookingService.expireOverdueBookings();
    }
}
