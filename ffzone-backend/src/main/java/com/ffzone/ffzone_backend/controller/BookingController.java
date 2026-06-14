package com.ffzone.ffzone_backend.controller;

import com.ffzone.ffzone_backend.dto.request.BookingRequest;
import com.ffzone.ffzone_backend.dto.response.BookingResponse;
import com.ffzone.ffzone_backend.entity.Account;
import com.ffzone.ffzone_backend.enums.BookingStatus;
import com.ffzone.ffzone_backend.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    // ── USER: Tạo booking ────────────────────────────────────────────────────
    // POST /api/bookings
    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<BookingResponse> create(
            @AuthenticationPrincipal Account account,
            @RequestBody BookingRequest req) {
        BookingResponse res = bookingService.createBooking(account.getId(), req);
        return ResponseEntity
            .created(URI.create("/api/bookings/" + res.getId()))
            .body(res);
    }

    // ── USER: Lịch sử booking của tôi ────────────────────────────────────────
    // GET /api/bookings/my
    @GetMapping("/my")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<BookingResponse>> myBookings(
            @AuthenticationPrincipal Account account) {
        return ResponseEntity.ok(bookingService.getMyBookings(account.getId()));
    }

    // ── USER: Chi tiết 1 booking của tôi ─────────────────────────────────────
    // GET /api/bookings/my/{id}
    @GetMapping("/my/{id}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<BookingResponse> myBookingDetail(
            @PathVariable UUID id,
            @AuthenticationPrincipal Account account) {
        BookingResponse res = bookingService.getBookingDetail(id);
        // Kiểm tra ownership
        if (!res.getAccountId().equals(account.getId()))
            return ResponseEntity.status(403).build();
        return ResponseEntity.ok(res);
    }

    // ── USER: Huỷ booking ────────────────────────────────────────────────────
    // POST /api/bookings/{id}/cancel
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<BookingResponse> cancel(
            @PathVariable UUID id,
            @AuthenticationPrincipal Account account) {
        return ResponseEntity.ok(bookingService.cancelBooking(id, account.getId()));
    }

    // ── STAFF: Xem tất cả booking ────────────────────────────────────────────
    // GET /api/bookings
    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF','IT_ADMIN','OWNER')")
    public ResponseEntity<List<BookingResponse>> getAll(
            @RequestParam(required = false) BookingStatus status) {
        if (status != null)
            return ResponseEntity.ok(bookingService.getByStatus(status));
        return ResponseEntity.ok(bookingService.getAllBookings());
    }

    // ── STAFF / IT_ADMIN: Chi tiết bất kỳ booking ────────────────────────────
    // GET /api/bookings/{id}
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','IT_ADMIN','OWNER')")
    public ResponseEntity<BookingResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(bookingService.getBookingDetail(id));
    }

    // ── STAFF: Check-in ───────────────────────────────────────────────────────
    // POST /api/bookings/{id}/checkin
    @PostMapping("/{id}/checkin")
    @PreAuthorize("hasRole('STAFF')")
    public ResponseEntity<BookingResponse> checkin(@PathVariable UUID id) {
        return ResponseEntity.ok(bookingService.checkin(id));
    }

    // ── STAFF: Check-out / Hoàn thành ────────────────────────────────────────
    // POST /api/bookings/{id}/checkout
    @PostMapping("/{id}/checkout")
    @PreAuthorize("hasRole('STAFF')")
    public ResponseEntity<BookingResponse> checkout(@PathVariable UUID id) {
        return ResponseEntity.ok(bookingService.checkout(id));
    }
}
