package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.response.FieldImageResponse;
import com.ffzone.ffzone_backend.entity.Field;
import com.ffzone.ffzone_backend.entity.FieldImage;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.FieldImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FieldImageService {

    private static final List<String> ALLOWED_EXTENSIONS = List.of(".jpg", ".jpeg", ".png", ".gif", ".webp");
    private static final String PUBLIC_URL_PREFIX = "uploads/field-images/";

    private final FieldImageRepository fieldImageRepository;
    private final FieldService fieldService;

    @Value("${app.upload.field-images-dir:uploads/field-images}")
    private String fieldImagesDir;

    public List<FieldImageResponse> findByFieldId(UUID fieldId) {
        fieldService.getOrThrow(fieldId);
        return fieldImageRepository.findByFieldId(fieldId).stream()
            .sorted(Comparator.comparing(FieldImage::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .map(FieldImageResponse::from)
            .toList();
    }

    public List<FieldImageResponse> getByField(UUID fieldId) {
        return findByFieldId(fieldId);
    }

    @Transactional
    public FieldImageResponse upload(UUID fieldId, MultipartFile file, Boolean isThumbnail) {
        if (file == null || file.isEmpty()) {
            throw AppException.badRequest("Image file is required");
        }

        String extension = getAllowedExtension(file.getOriginalFilename());
        Field field = fieldService.getOrThrow(fieldId);

        String fileName = UUID.randomUUID() + extension;
        Path uploadDir = Paths.get(fieldImagesDir).toAbsolutePath().normalize();
        Path target = uploadDir.resolve(fileName).normalize();
        if (!target.startsWith(uploadDir)) {
            throw AppException.badRequest("Invalid upload path");
        }

        try {
            Files.createDirectories(uploadDir);
            file.transferTo(target);
        } catch (IOException ex) {
            throw new AppException("Could not store image file", HttpStatus.INTERNAL_SERVER_ERROR);
        }

        boolean shouldBeThumbnail = Boolean.TRUE.equals(isThumbnail)
            || fieldImageRepository.findByFieldId(fieldId).isEmpty();

        if (shouldBeThumbnail) {
            clearThumbnails(fieldId);
        }

        FieldImage image = FieldImage.builder()
            .field(field)
            .imageUrl(PUBLIC_URL_PREFIX + fileName)
            .isThumbnail(shouldBeThumbnail)
            .build();

        return FieldImageResponse.from(fieldImageRepository.save(image));
    }

    @Transactional
    public FieldImageResponse setThumbnail(UUID imageId) {
        FieldImage image = getOrThrow(imageId);
        UUID fieldId = image.getField().getId();
        clearThumbnails(fieldId);
        image.setIsThumbnail(true);
        return FieldImageResponse.from(fieldImageRepository.save(image));
    }

    @Transactional
    public void delete(UUID imageId) {
        FieldImage image = getOrThrow(imageId);
        deletePhysicalFile(image.getImageUrl());
        fieldImageRepository.delete(image);
    }

    private FieldImage getOrThrow(UUID imageId) {
        return fieldImageRepository.findById(imageId)
            .orElseThrow(() -> AppException.notFound("Image not found: " + imageId));
    }

    private void clearThumbnails(UUID fieldId) {
        List<FieldImage> thumbnails = fieldImageRepository.findByFieldIdAndIsThumbnail(fieldId, true);
        thumbnails.forEach(image -> image.setIsThumbnail(false));
        fieldImageRepository.saveAll(thumbnails);
    }

    private String getAllowedExtension(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            throw AppException.badRequest("Image filename is required");
        }

        String lower = originalFilename.toLowerCase(Locale.ROOT);
        return ALLOWED_EXTENSIONS.stream()
            .filter(lower::endsWith)
            .findFirst()
            .orElseThrow(() -> AppException.badRequest("Only jpg, jpeg, png, gif, and webp images are allowed"));
    }

    private void deletePhysicalFile(String imageUrl) {
        if (imageUrl == null || !imageUrl.startsWith(PUBLIC_URL_PREFIX)) {
            return;
        }

        String fileName = imageUrl.substring(PUBLIC_URL_PREFIX.length());
        Path uploadDir = Paths.get(fieldImagesDir).toAbsolutePath().normalize();
        Path target = uploadDir.resolve(fileName).normalize();
        if (!target.startsWith(uploadDir)) {
            return;
        }

        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // The database row should still be removable if the physical file is already gone.
        }
    }
}
