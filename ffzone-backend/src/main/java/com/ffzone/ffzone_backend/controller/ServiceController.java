package com.ffzone.ffzone_backend.controller;

import com.ffzone.ffzone_backend.dto.request.ServiceRequest;
import com.ffzone.ffzone_backend.dto.response.ServiceResponse;
import com.ffzone.ffzone_backend.enums.ServiceCategory;
import com.ffzone.ffzone_backend.service.ServiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
public class ServiceController {

    private final ServiceService serviceService;

    @GetMapping
    public ResponseEntity<List<ServiceResponse>> getAll() {
        return ResponseEntity.ok(serviceService.findAll());
    }

    @GetMapping("/active")
    public ResponseEntity<List<ServiceResponse>> getActive() {
        return ResponseEntity.ok(serviceService.findActive());
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<List<ServiceResponse>> getByCategory(@PathVariable ServiceCategory category) {
        return ResponseEntity.ok(serviceService.findByCategory(category));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(serviceService.findById(id));
    }

    @PostMapping
    public ResponseEntity<ServiceResponse> create(@RequestBody ServiceRequest req) {
        ServiceResponse created = serviceService.create(req);
        return ResponseEntity.created(URI.create("/api/services/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServiceResponse> update(@PathVariable UUID id, @RequestBody ServiceRequest req) {
        return ResponseEntity.ok(serviceService.update(id, req));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<ServiceResponse> toggleActive(@PathVariable UUID id) {
        return ResponseEntity.ok(serviceService.toggleActive(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        serviceService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
