package com.ffzone.ffzone_backend.controller;

import com.ffzone.ffzone_backend.dto.response.FieldSlotResponse;
import com.ffzone.ffzone_backend.service.FieldSlotService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    // GET /api/field-slots/field/{fieldId}?date=2026-06-05
    @GetMapping("/field/{fieldId}")
    public ResponseEntity<List<FieldSlotResponse>> getByFieldAndDate(
            @PathVariable UUID fieldId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(slotService.findByFieldAndDate(fieldId, date));
    }

    // GET /api/field-slots/field/{fieldId}/available?date=2026-06-05
    @GetMapping("/field/{fieldId}/available")
    public ResponseEntity<List<FieldSlotResponse>> getAvailable(
            @PathVariable UUID fieldId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(slotService.findAvailableByFieldAndDate(fieldId, date));
    }

    // GET /api/field-slots/field/{fieldId}/range?from=2026-06-05&to=2026-06-11
    @GetMapping("/field/{fieldId}/range")
    public ResponseEntity<List<FieldSlotResponse>> getByRange(
            @PathVariable UUID fieldId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(slotService.findByFieldAndDateRange(fieldId, from, to));
    }
}
