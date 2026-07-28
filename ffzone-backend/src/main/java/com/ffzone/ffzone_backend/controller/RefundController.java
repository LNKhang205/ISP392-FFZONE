package com.ffzone.ffzone_backend.controller;

import com.ffzone.ffzone_backend.dto.response.RefundResponse;
import com.ffzone.ffzone_backend.entity.Account;
import com.ffzone.ffzone_backend.service.RefundService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/refunds")
@RequiredArgsConstructor
public class RefundController {

    private final RefundService refundService;

    /** Danh sách yêu cầu hoàn tiền đang chờ — Staff Refund Management screen. */
    @GetMapping("/pending")
    public ResponseEntity<List<RefundResponse>> findPending() {
        return ResponseEntity.ok(refundService.findPending());
    }

    @GetMapping
    public ResponseEntity<List<RefundResponse>> findAll() {
        return ResponseEntity.ok(refundService.findAll());
    }

    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<RefundResponse> findByBookingId(
            @AuthenticationPrincipal Account account,
            @PathVariable UUID bookingId) {
        return ResponseEntity.ok(refundService.findByBookingId(account, bookingId));
    }

    /** Staff xác nhận đã chuyển khoản hoàn tiền thủ công xong. */
    @PostMapping("/{id}/complete")
    public ResponseEntity<RefundResponse> markAsCompleted(
            @AuthenticationPrincipal Account staff,
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body) {
        String note = body != null ? body.get("note") : null;
        return ResponseEntity.ok(refundService.markAsCompleted(staff, id, note));
    }

    /** Từ chối yêu cầu hoàn tiền. */
    @PostMapping("/{id}/reject")
    public ResponseEntity<RefundResponse> reject(
            @AuthenticationPrincipal Account staff,
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(refundService.reject(staff, id, body.get("note")));
    }
}
