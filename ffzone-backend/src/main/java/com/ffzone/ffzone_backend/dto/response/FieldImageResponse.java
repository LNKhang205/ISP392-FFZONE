package com.ffzone.ffzone_backend.dto.response;

import com.ffzone.ffzone_backend.entity.FieldImage;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder
public class FieldImageResponse {
    private UUID id;
    private UUID fieldId;
    private String imageUrl;
    private Boolean isThumbnail;
    private LocalDateTime createdAt;

    public static FieldImageResponse from(FieldImage image) {
        return FieldImageResponse.builder()
            .id(image.getId())
            .fieldId(image.getField().getId())
            .imageUrl(image.getImageUrl())
            .isThumbnail(image.getIsThumbnail())
            .createdAt(image.getCreatedAt())
            .build();
    }
}
