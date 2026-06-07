package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.request.FieldRequest;
import com.ffzone.ffzone_backend.dto.response.FieldResponse;
import com.ffzone.ffzone_backend.entity.Field;
import com.ffzone.ffzone_backend.enums.FieldStatus;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.FieldRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FieldService {

    private final FieldRepository fieldRepository;

    public List<FieldResponse> findAll() {
        return fieldRepository.findAll().stream().map(FieldResponse::from).toList();
    }

    public List<FieldResponse> findActive() {
        return fieldRepository.findByStatus(FieldStatus.ACTIVE).stream().map(FieldResponse::from).toList();
    }

    public FieldResponse findById(UUID id) {
        return FieldResponse.from(getOrThrow(id));
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
        return FieldResponse.from(fieldRepository.save(field));
    }

    @Transactional
    public FieldResponse update(UUID id, FieldRequest req) {
        Field field = getOrThrow(id);
        if (req.getName() != null) field.setName(req.getName());
        if (req.getType() != null) field.setType(req.getType());
        if (req.getDescription() != null) field.setDescription(req.getDescription());
        if (req.getStatus() != null) field.setStatus(req.getStatus());
        return FieldResponse.from(fieldRepository.save(field));
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
}
