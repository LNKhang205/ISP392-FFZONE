package com.ffzone.ffzone_backend.controller;

import com.ffzone.ffzone_backend.dto.request.AddToCartRequest;
import com.ffzone.ffzone_backend.dto.response.BookingServiceResponse;
import com.ffzone.ffzone_backend.entity.Account;
import com.ffzone.ffzone_backend.service.BookingItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookings/{bookingId}/services")
@RequiredArgsConstructor
public class BookingItemController {

    private final BookingItemService bookingItemService;

    /** Lấy danh sách dịch vụ của booking */
    @GetMapping
    public ResponseEntity<List<BookingServiceResponse>> getItems(@PathVariable UUID bookingId) {
        return ResponseEntity.ok(bookingItemService.getItems(bookingId));
    }

    /**
     * Checkout Cart → BookingService.
     * Chuyển toàn bộ giỏ hàng dịch vụ vào booking, làm trống cart.
     */
    @PostMapping("/checkout-cart")
    public ResponseEntity<List<BookingServiceResponse>> checkoutCart(
            @AuthenticationPrincipal Account account,
            @PathVariable UUID bookingId) {
        return ResponseEntity.ok(bookingItemService.checkoutCart(account, bookingId));
    }

    /**
     * Thêm dịch vụ trực tiếp vào booking (sau khi đã thanh toán sân,
     * khách mở Booking Detail và thêm thêm).
     */
    @PostMapping
    public ResponseEntity<List<BookingServiceResponse>> addService(
            @AuthenticationPrincipal Account account,
            @PathVariable UUID bookingId,
            @Valid @RequestBody AddToCartRequest req) {
        return ResponseEntity.ok(bookingItemService.addServiceToBooking(account, bookingId, req));
    }

    /** Xóa 1 dịch vụ khỏi booking */
    @DeleteMapping("/{bookingServiceId}")
    public ResponseEntity<Void> removeService(
            @AuthenticationPrincipal Account account,
            @PathVariable UUID bookingId,
            @PathVariable UUID bookingServiceId) {
        bookingItemService.removeServiceFromBooking(account, bookingId, bookingServiceId);
        return ResponseEntity.noContent().build();
    }
}
