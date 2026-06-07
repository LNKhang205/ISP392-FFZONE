package com.ffzone.ffzone_backend.controller;

import com.ffzone.ffzone_backend.dto.request.FieldRequest;
import com.ffzone.ffzone_backend.dto.response.FieldResponse;
import com.ffzone.ffzone_backend.service.FieldService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/fields")
@RequiredArgsConstructor
public class FieldController {

    private final FieldService fieldService;

    @GetMapping
    public ResponseEntity<List<FieldResponse>> getAll() {
        return ResponseEntity.ok(fieldService.findAll());
    }

    @GetMapping("/active")
    public ResponseEntity<List<FieldResponse>> getActive() {
        return ResponseEntity.ok(fieldService.findActive());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FieldResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(fieldService.findById(id));
    }

    @PostMapping
    public ResponseEntity<FieldResponse> create(@RequestBody FieldRequest req) {
        FieldResponse created = fieldService.create(req);
        return ResponseEntity.created(URI.create("/api/fields/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<FieldResponse> update(@PathVariable UUID id, @RequestBody FieldRequest req) {
        return ResponseEntity.ok(fieldService.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        fieldService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
