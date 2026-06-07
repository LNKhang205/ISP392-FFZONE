package com.ffzone.ffzone_backend.repository;

import com.ffzone.ffzone_backend.entity.FieldImage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface FieldImageRepository extends JpaRepository<FieldImage, UUID> {
    List<FieldImage> findByFieldId(UUID fieldId);
    List<FieldImage> findByFieldIdAndIsThumbnail(UUID fieldId, Boolean isThumbnail);
    void deleteByFieldId(UUID fieldId);
}
