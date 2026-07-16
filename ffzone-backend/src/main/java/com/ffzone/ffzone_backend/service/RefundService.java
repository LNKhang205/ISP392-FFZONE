package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.response.RefundResponse;
import com.ffzone.ffzone_backend.entity.Account;
import com.ffzone.ffzone_backend.entity.Booking;
import com.ffzone.ffzone_backend.entity.Refund;
import com.ffzone.ffzone_backend.enums.BookingStatus;
import com.ffzone.ffzone_backend.enums.RefundStatus;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.BookingRepository;
import com.ffzone.ffzone_backend.repository.RefundRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Quản lý các yêu cầu hoàn tiền (Refund) sinh ra khi user/staff hủy booking đã thanh toán.
 * Refund chỉ được tạo bởi BookingService.cancelBooking() — RefundService chỉ xử lý
 * tiếp theo: Staff xem danh sách PENDING, thực hiện chuyển khoản thủ công ngoài hệ thống,
 * rồi đánh dấu COMPLETED (BR-14 trong screen description "Refund Management").
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RefundService {

    private final RefundRepository  refundRepository;
    private final BookingRepository bookingRepository;
    private final EmailService      emailService;

    /** Danh sách refund đang chờ xử lý — Staff dashboard. */
    @Transactional
    public List<RefundResponse> findPending() {
        return refundRepository.findByStatus(RefundStatus.PENDING).stream()
                .map(RefundResponse::from)
                .toList();
    }

    @Transactional
    public List<RefundResponse> findAll() {
        return refundRepository.findAll().stream()
                .map(RefundResponse::from)
                .toList();
    }

    @Transactional
    public RefundResponse findByBookingId(UUID bookingId) {
        Refund r = refundRepository.findByBookingId(bookingId)
                .orElseThrow(() -> AppException.notFound("Không có yêu cầu hoàn tiền cho booking này"));
        return RefundResponse.from(r);
    }

    /**
     * Staff xác nhận đã chuyển khoản hoàn tiền thủ công (BR-14: "After completing the
     * manual bank transfer, Staff marks the record as REFUNDED").
     * Đồng thời set Booking.status = REFUNDED nếu refund_percent > 0,
     * hoặc giữ CANCELLED nếu refund_percent = 0 (không có tiền hoàn — chỉ đóng task).
     */
    @Transactional
    public RefundResponse markAsCompleted(Account staff, UUID refundId, String note) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> AppException.notFound("Yêu cầu hoàn tiền không tồn tại: " + refundId));

        if (refund.getStatus() == RefundStatus.COMPLETED)
            throw AppException.badRequest("Yêu cầu này đã được xử lý hoàn tất");

        refund.setStatus(RefundStatus.COMPLETED);
        refund.setProcessedBy(staff);
        refund.setProcessedAt(LocalDateTime.now());
        if (note != null && !note.isBlank()) {
            refund.setNote(note);
        }
        refundRepository.save(refund);

        Booking booking = refund.getBooking();
        if (refund.getRefundPercent() > 0) {
            booking.setStatus(BookingStatus.REFUNDED);
            bookingRepository.save(booking);

            emailService.sendRefundCompleted(
                booking.getAccount().getEmail(),
                booking.getAccount().getFullName(),
                booking.getBookingCode(),
                refund.getRefundAmount()
            );
        }
        // refund_percent = 0: booking đã CANCELLED từ trước (penalty 100%, BR-49) — không đổi thêm.

        log.info("[Refund] Staff {} xác nhận hoàn tiền {}đ cho booking {}",
                staff.getEmail(), refund.getRefundAmount(), booking.getBookingCode());

        return RefundResponse.from(refund);
    }

    /** Từ chối yêu cầu hoàn tiền (trường hợp phát hiện gian lận / sai sót). */
    @Transactional
    public RefundResponse reject(Account staff, UUID refundId, String note) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> AppException.notFound("Yêu cầu hoàn tiền không tồn tại: " + refundId));

        if (refund.getStatus() == RefundStatus.COMPLETED)
            throw AppException.badRequest("Không thể từ chối yêu cầu đã hoàn tất");

        refund.setStatus(RefundStatus.REJECTED);
        refund.setProcessedBy(staff);
        refund.setProcessedAt(LocalDateTime.now());
        refund.setNote(note);
        refundRepository.save(refund);

        log.info("[Refund] Staff {} từ chối hoàn tiền cho booking {}",
                staff.getEmail(), refund.getBooking().getBookingCode());

        return RefundResponse.from(refund);
    }
}