package com.ffzone.ffzone_backend.scheduler;

import com.ffzone.ffzone_backend.entity.Booking;
import com.ffzone.ffzone_backend.repository.BookingRepository;
import com.ffzone.ffzone_backend.service.BookingFlowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Tự động hủy các booking PENDING_PAYMENT đã quá payment_deadline.
 * Theo BR-27: tổng thời gian khóa slot (đặt + thanh toán) là 10 PHÚT, tính từ
 * lúc tạo booking — KHÔNG tách 5 phút đặt + 5 phút thanh toán riêng.
 * Giải phóng field_slot về AVAILABLE để người khác có thể đặt lại.
 *
 * Mỗi booking xử lý trong 1 transaction riêng (qua BookingFlowService.expirePendingBooking)
 * để 1 booking lỗi không làm rollback cả batch.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BookingScheduler {

    private final BookingRepository bookingRepository;
    private final BookingFlowService bookingService;

    /** Chạy mỗi 1 phút — đủ nhanh để không giữ slot PENDING quá lâu sau khi hết hạn. */
    @Scheduled(fixedDelay = 60_000)
    public void expirePendingBookings() {
        List<Booking> expired = bookingRepository.findExpiredPendingBookings(LocalDateTime.now());

        if (expired.isEmpty()) return;

        log.info("=== [BookingScheduler] Tìm thấy {} booking quá hạn thanh toán ===", expired.size());

        for (Booking booking : expired) {
            try {
                bookingService.expirePendingBooking(booking);
            } catch (Exception e) {
                log.error("[BookingScheduler] Lỗi hủy booking {}: {}",
                        booking.getBookingCode(), e.getMessage(), e);
            }
        }
    }
}