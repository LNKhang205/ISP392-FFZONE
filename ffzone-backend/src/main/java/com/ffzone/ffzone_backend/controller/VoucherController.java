package com.ffzone.ffzone_backend.controller;

import com.ffzone.ffzone_backend.dto.request.VoucherRequest;
import com.ffzone.ffzone_backend.dto.response.VoucherResponse;
import com.ffzone.ffzone_backend.service.VoucherService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/vouchers")
@RequiredArgsConstructor
public class VoucherController {

    private final VoucherService voucherService;

    @GetMapping
    public ResponseEntity<List<VoucherResponse>> getAll() {
        return ResponseEntity.ok(voucherService.findAll());
    }

    @GetMapping("/available")
    public ResponseEntity<List<VoucherResponse>> getAvailable() {
        return ResponseEntity.ok(voucherService.findAvailable());
    }

    @GetMapping("/{id}")
    public ResponseEntity<VoucherResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(voucherService.findById(id));
    }

    @PostMapping
    public ResponseEntity<VoucherResponse> create(@RequestBody VoucherRequest req) {
        VoucherResponse created = voucherService.create(req);
        return ResponseEntity.created(URI.create("/api/vouchers/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<VoucherResponse> update(@PathVariable UUID id, @RequestBody VoucherRequest req) {
        return ResponseEntity.ok(voucherService.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        voucherService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
