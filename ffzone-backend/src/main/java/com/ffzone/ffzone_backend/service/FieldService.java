package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.request.FieldRequest;
import com.ffzone.ffzone_backend.dto.response.FieldResponse;
import com.ffzone.ffzone_backend.entity.Field;
import com.ffzone.ffzone_backend.entity.FieldImage;
import com.ffzone.ffzone_backend.enums.FieldStatus;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.FieldImageRepository;
import com.ffzone.ffzone_backend.repository.FieldRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FieldService {

    private final FieldRepository      fieldRepository;
    private final FieldImageRepository fieldImageRepository;
    private final SlotGeneratorService slotGeneratorService;  // thay FieldSlotService

    public List<FieldResponse> findAll() {
        return fieldRepository.findAll().stream()
            .map(f -> FieldResponse.from(f, getThumbnailUrl(f.getId())))
            .toList();
    }

    public List<FieldResponse> findActive() {
        return fieldRepository.findByStatus(FieldStatus.ACTIVE).stream()
            .map(f -> FieldResponse.from(f, getThumbnailUrl(f.getId())))
            .toList();
    }

    public FieldResponse findById(UUID id) {
        Field f = getOrThrow(id);
        return FieldResponse.from(f, getThumbnailUrl(id));
    }

    @Transactional
    public FieldResponse create(FieldRequest req) {
        if (fieldRepository.existsByCode(req.getCode()))
            throw AppException.conflict("Mã sân đã tồn tại: " + req.getCode());

        Field field = Field.builder()
            .code(req.getCode().toUpperCase())
            .name(req.getName())
            .type(req.getType())
            .description(req.getDescription())
            .status(req.getStatus() != null ? req.getStatus() : FieldStatus.ACTIVE)
            .build();
        Field saved = fieldRepository.save(field);

        // Auto-generate slots cho 7 ngày tới — mỗi ngày là 1 tx nhỏ
        LocalDate today = LocalDate.now();
        for (int i = 0; i < 7; i++)
            slotGeneratorService.generateForField(saved, today.plusDays(i));

        return FieldResponse.from(saved, null);
    }

    @Transactional
    public FieldResponse update(UUID id, FieldRequest req) {
        Field field = getOrThrow(id);
        if (req.getName()        != null) field.setName(req.getName());
        if (req.getType()        != null) field.setType(req.getType());
        if (req.getDescription() != null) field.setDescription(req.getDescription());
        if (req.getStatus()      != null) field.setStatus(req.getStatus());
        Field saved = fieldRepository.save(field);
        return FieldResponse.from(saved, getThumbnailUrl(id));
    }

    @Transactional
    public void delete(UUID id) {
        getOrThrow(id);
        fieldRepository.deleteById(id);
    }

    public Field getOrThrow(UUID id) {
        return fieldRepository.findById(id)
            .orElseThrow(() -> AppException.notFound("Sân không tồn tại: " + id));
    }

    private String getThumbnailUrl(UUID fieldId) {
        List<FieldImage> thumbs = fieldImageRepository.findByFieldIdAndIsThumbnail(fieldId, true);
        if (!thumbs.isEmpty()) return thumbs.get(0).getImageUrl();
        List<FieldImage> all = fieldImageRepository.findByFieldId(fieldId);
        return all.isEmpty() ? null : all.get(0).getImageUrl();
    }
}
