package com.ffzone.ffzone_backend.controller;

import com.ffzone.ffzone_backend.dto.response.FieldImageResponse;
import com.ffzone.ffzone_backend.service.FieldImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/field-images")
@RequiredArgsConstructor
public class FieldImageController {

    private final FieldImageService fieldImageService;

    @GetMapping("/field/{fieldId}")
    public ResponseEntity<List<FieldImageResponse>> getByField(@PathVariable UUID fieldId) {
        return ResponseEntity.ok(fieldImageService.findByFieldId(fieldId));
    }

    @PostMapping(value = "/upload/{fieldId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FieldImageResponse> upload(
            @PathVariable UUID fieldId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "isThumbnail", required = false, defaultValue = "false") Boolean isThumbnail) {
        FieldImageResponse created = fieldImageService.upload(fieldId, file, isThumbnail);
        return ResponseEntity.created(URI.create("/api/field-images/" + created.getId())).body(created);
    }

    @PutMapping("/{imageId}/thumbnail")
    public ResponseEntity<FieldImageResponse> setThumbnail(@PathVariable UUID imageId) {
        return ResponseEntity.ok(fieldImageService.setThumbnail(imageId));
    }

    @DeleteMapping("/{imageId}")
    public ResponseEntity<Void> delete(@PathVariable UUID imageId) {
        fieldImageService.delete(imageId);
        return ResponseEntity.noContent().build();
    }
}
