package com.ffzone.ffzone_backend.controller;

import com.ffzone.ffzone_backend.dto.request.FieldPricingRequest;
import com.ffzone.ffzone_backend.dto.response.FieldPricingResponse;
import com.ffzone.ffzone_backend.service.FieldPricingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/field-pricings")
@RequiredArgsConstructor
public class FieldPricingController {

    private final FieldPricingService pricingService;

    @GetMapping("/field/{fieldId}")
    public ResponseEntity<List<FieldPricingResponse>> getByField(@PathVariable UUID fieldId) {
        return ResponseEntity.ok(pricingService.findByField(fieldId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FieldPricingResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(pricingService.findById(id));
    }

    @PostMapping
    public ResponseEntity<FieldPricingResponse> create(@RequestBody FieldPricingRequest req) {
        FieldPricingResponse created = pricingService.create(req);
        return ResponseEntity.created(URI.create("/api/field-pricings/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<FieldPricingResponse> update(@PathVariable UUID id, @RequestBody FieldPricingRequest req) {
        return ResponseEntity.ok(pricingService.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        pricingService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
