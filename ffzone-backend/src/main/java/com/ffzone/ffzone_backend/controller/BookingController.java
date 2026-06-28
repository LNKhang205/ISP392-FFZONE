package com.ffzone.ffzone_backend.controller;

import com.ffzone.ffzone_backend.dto.request.CreateBookingRequest;
import com.ffzone.ffzone_backend.dto.response.BookingResponse;
import com.ffzone.ffzone_backend.entity.Account;
import com.ffzone.ffzone_backend.service.BookingFlowService;
import com.ffzone.ffzone_backend.service.BookingFlowService.AddVenueServiceItem;
import com.ffzone.ffzone_backend.service.BookingFlowService.AddVenueServiceResult;
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

    /**
     * Đặt thêm dịch vụ tại sân (khi booking đã CONFIRMED hoặc IN_PROGRESS).
     * Body: { "items": [{ "serviceId": "...", "quantity": 2 }], "voucherCode": "ABCD" (tùy chọn) }
     * Trả về: { "bookingId", "bookingCode", "payAmount" } — FE dùng payAmount để tạo payment URL.
     */
    @PostMapping("/{id}/add-services-at-venue")
    public ResponseEntity<AddVenueServiceResult> addServicesAtVenue(
            @AuthenticationPrincipal Account account,
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body) {

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rawItems = (List<Map<String, Object>>) body.get("items");
        String voucherCode = (String) body.get("voucherCode");

        List<AddVenueServiceItem> items = rawItems.stream()
                .map(m -> new AddVenueServiceItem(
                        UUID.fromString((String) m.get("serviceId")),
                        m.get("quantity") instanceof Number n ? n.intValue() : 1))
                .toList();

        AddVenueServiceResult result = bookingService.addServicesAtVenue(account, id, items, voucherCode);
        return ResponseEntity.ok(result);
    }
}