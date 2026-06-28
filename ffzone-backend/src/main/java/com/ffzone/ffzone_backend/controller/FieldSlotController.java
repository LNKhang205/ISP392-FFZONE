package com.ffzone.ffzone_backend.controller;

import com.ffzone.ffzone_backend.dto.response.FieldSlotResponse;
import com.ffzone.ffzone_backend.service.FieldSlotService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/field-slots")
@RequiredArgsConstructor
public class FieldSlotController {

    private final FieldSlotService slotService;

    @GetMapping("/{id}")
    public ResponseEntity<FieldSlotResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(slotService.findById(id));
    }

    @GetMapping("/field/{fieldId}")
    public ResponseEntity<List<FieldSlotResponse>> getByFieldAndDate(
            @PathVariable UUID fieldId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(slotService.findByFieldAndDate(fieldId, date));
    }

    @GetMapping("/field/{fieldId}/available")
    public ResponseEntity<List<FieldSlotResponse>> getAvailable(
            @PathVariable UUID fieldId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(slotService.findAvailableByFieldAndDate(fieldId, date));
    }

    @GetMapping("/date")
    public ResponseEntity<List<FieldSlotResponse>> getAllByDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(slotService.findAllByDate(date));
    }

    @GetMapping("/field/{fieldId}/range")
    public ResponseEntity<List<FieldSlotResponse>> getByRange(
            @PathVariable UUID fieldId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(slotService.findByFieldAndDateRange(fieldId, from, to));
    }

    /**
     * Cập nhật giá các slot đã sinh trong khoảng ngày lễ.
     * Gọi sau khi tạo holiday pricing để sync giá slot.
     * Body: { fieldIds: [...], from: "2026-01-28", to: "2026-02-02", adjustmentPercent: 50 }
     */
    @PostMapping("/apply-holiday")
    @PreAuthorize("hasRole('IT_ADMIN')")
    public ResponseEntity<Integer> applyHolidayToSlots(@RequestBody ApplyHolidayRequest req) {
        int updated = slotService.applyHolidayAdjustment(
            req.getFieldIds(), req.getFrom(), req.getTo(), req.getAdjustmentPercent()
        );
        return ResponseEntity.ok(updated);
    }

    @Data
    static class ApplyHolidayRequest {
        private List<UUID> fieldIds;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate from;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate to;
        private BigDecimal adjustmentPercent;
    }
}
