package com.ffzone.ffzone_backend.dto.response;

import com.ffzone.ffzone_backend.entity.Field;
import com.ffzone.ffzone_backend.enums.FieldStatus;
import com.ffzone.ffzone_backend.enums.FieldType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder
public class FieldResponse {
    private UUID id;
    private String code;
    private String name;
    private FieldType type;
    private String description;
    private FieldStatus status;
    private LocalDateTime createdAt;

    public static FieldResponse from(Field f) {
        return FieldResponse.builder()
            .id(f.getId()).code(f.getCode()).name(f.getName())
            .type(f.getType()).description(f.getDescription())
            .status(f.getStatus()).createdAt(f.getCreatedAt()).build();
    }
}
