package com.ffzone.ffzone_backend.controller;

import com.ffzone.ffzone_backend.dto.request.FieldPricingRequest;
import com.ffzone.ffzone_backend.dto.response.FieldPricingResponse;
import com.ffzone.ffzone_backend.service.FieldPricingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/field-pricings")
@RequiredArgsConstructor
public class FieldPricingController {

    private final FieldPricingService pricingService;

    // ════════════════════════════════════════════════════════════
    // ENDPOINT CŨ — GIỮ NGUYÊN
    // ════════════════════════════════════════════════════════════

    /** Pricing của 1 sân — public, BookingPage dùng để tính giá */
    @GetMapping("/field/{fieldId}")
    public ResponseEntity<List<FieldPricingResponse>> getByField(@PathVariable UUID fieldId) {
        return ResponseEntity.ok(pricingService.findByField(fieldId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FieldPricingResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(pricingService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('IT_ADMIN')")
    public ResponseEntity<FieldPricingResponse> create(@RequestBody FieldPricingRequest req) {
        FieldPricingResponse created = pricingService.create(req);
        return ResponseEntity.created(URI.create("/api/field-pricings/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('IT_ADMIN')")
    public ResponseEntity<FieldPricingResponse> update(
            @PathVariable UUID id, @RequestBody FieldPricingRequest req) {
        return ResponseEntity.ok(pricingService.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('IT_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        pricingService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ════════════════════════════════════════════════════════════
    // ENDPOINT MỚI
    // ════════════════════════════════════════════════════════════

    /**
     * Tất cả pricing (admin xem tổng quan).
     */
    @GetMapping
    @PreAuthorize("hasRole('IT_ADMIN')")
    public ResponseEntity<List<FieldPricingResponse>> getAll() {
        return ResponseEntity.ok(pricingService.findAll());
    }

    /**
     * HOLIDAY đang có hiệu lực hoặc sắp có (trong 30 ngày tới).
     * Public — BookingPage dùng để hiển thị banner thông báo.
     */
    @GetMapping("/holidays/current")
    public ResponseEntity<List<FieldPricingResponse>> getCurrentHolidays() {
        return ResponseEntity.ok(pricingService.findCurrentHolidays());
    }

    /**
     * Chỉ lấy các bản ghi HOLIDAY đang active.
     * Dùng bởi tab "Giá ngày lễ" trong PricingManagement.
     */
    @GetMapping("/holidays")
    @PreAuthorize("hasRole('IT_ADMIN')")
    public ResponseEntity<List<FieldPricingResponse>> getAllHolidays() {
        return ResponseEntity.ok(pricingService.findAllHolidays());
    }

    /**
     * Tạo hoặc cập nhật giá bình thường cho 1 sân.
     * Tự sinh 2 bản ghi: WEEKDAY + WEEKEND (weekend = weekdayPrice × 1.25).
     * Body: { weekdayPrice, startTime?, endTime?, effectiveFrom?, effectiveTo? }
     */
    @PostMapping("/field/{fieldId}")
    @PreAuthorize("hasRole('IT_ADMIN')")
    public ResponseEntity<List<FieldPricingResponse>> createOrUpdate(
            @PathVariable UUID fieldId,
            @RequestBody FieldPricingRequest req) {
        return ResponseEntity.ok(pricingService.createOrUpdate(fieldId, req));
    }

    /**
     * Áp giá ngày lễ cho nhiều sân cùng lúc.
     */
    @PostMapping("/holiday/bulk")
    @PreAuthorize("hasRole('IT_ADMIN')")
    public ResponseEntity<List<FieldPricingResponse>> createHolidayBulk(
            @RequestBody FieldPricingRequest req) {
        return ResponseEntity.ok(pricingService.createHolidayBulk(req));
    }

    /**
     * Áp giá ngày thường + cuối tuần hàng loạt cho nhiều sân.
     * Body: { fieldIds: [...], weekdayPrice, startTime, endTime, effectiveFrom }
     */
    @PostMapping("/bulk-apply")
    @PreAuthorize("hasRole('IT_ADMIN')")
    public ResponseEntity<Integer> bulkApply(@RequestBody FieldPricingRequest req) {
        return ResponseEntity.ok(pricingService.bulkApply(req));
    }

    /**
     * Cập nhật thời gian áp dụng cho tất cả bản ghi của 1 dịp lễ.
     * Dùng khi muốn tái sử dụng holiday đã tạo mà không cần tạo lại.
     * Body: { holidayName, effectiveFrom, effectiveTo }
     */
    @PutMapping("/holiday/update-dates")
    @PreAuthorize("hasRole('IT_ADMIN')")
    public ResponseEntity<Integer> updateHolidayDates(@RequestBody FieldPricingRequest req) {
        return ResponseEntity.ok(pricingService.updateHolidayDates(req));
    }
}
