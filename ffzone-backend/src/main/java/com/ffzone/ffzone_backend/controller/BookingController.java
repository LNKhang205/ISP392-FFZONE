package com.ffzone.ffzone_backend.controller;

import com.ffzone.ffzone_backend.dto.request.CreateBookingRequest;
import com.ffzone.ffzone_backend.dto.response.BookingResponse;
import com.ffzone.ffzone_backend.entity.Account;
import com.ffzone.ffzone_backend.service.BookingFlowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingFlowService bookingService;

    /** Tạo booking mới: chọn slot + (tùy chọn) áp voucher. Services thêm sau qua /services/checkout-cart. */
    @PostMapping
    public ResponseEntity<BookingResponse> create(
            @AuthenticationPrincipal Account account,
            @Valid @RequestBody CreateBookingRequest req) {
        return ResponseEntity.ok(bookingService.createBooking(account, req));
    }

    /** Lịch sử booking của chính user đang đăng nhập */
    @GetMapping("/me")
    public ResponseEntity<List<BookingResponse>> myBookings(@AuthenticationPrincipal Account account) {
        return ResponseEntity.ok(bookingService.findMyBookings(account));
    }

    /** Toàn bộ booking — dùng cho Staff/Owner/IT Admin dashboard */
    @GetMapping
    public ResponseEntity<List<BookingResponse>> findAll() {
        return ResponseEntity.ok(bookingService.findAll());
    }

    /** Staff: lấy booking theo ngày — mặc định hôm nay nếu không truyền date */
    @GetMapping("/by-date")
    public ResponseEntity<List<BookingResponse>> findByDate(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE)
            java.time.LocalDate date) {
        return ResponseEntity.ok(bookingService.findByDate(date != null ? date : java.time.LocalDate.now()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookingResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(bookingService.findById(id));
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<BookingResponse> findByCode(@PathVariable String code) {
        return ResponseEntity.ok(bookingService.findByCode(code));
    }

    /** Hủy booking (BR-47/48/49) — body: { "reason": "..." } (tùy chọn) */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<BookingResponse> cancel(
            @AuthenticationPrincipal Account account,
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(bookingService.cancelBooking(account, id, reason));
    }

    /** UC18: Staff check-in khách — CONFIRMED → IN_PROGRESS (BR-52, BR-53) */
    @PostMapping("/{id}/checkin")
    public ResponseEntity<BookingResponse> checkin(
            @AuthenticationPrincipal Account staff,
            @PathVariable UUID id) {
        return ResponseEntity.ok(bookingService.checkin(staff, id));
    }

    /** UC19: Staff check-out khách — IN_PROGRESS → COMPLETED (BR-56, BR-81) */
    @PostMapping("/{id}/checkout")
    public ResponseEntity<BookingResponse> checkout(
            @AuthenticationPrincipal Account staff,
            @PathVariable UUID id) {
        return ResponseEntity.ok(bookingService.checkout(staff, id));
    }
}