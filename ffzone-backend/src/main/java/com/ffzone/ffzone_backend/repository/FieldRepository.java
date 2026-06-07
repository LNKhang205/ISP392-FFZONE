package com.ffzone.ffzone_backend.repository;

import com.ffzone.ffzone_backend.entity.Field;
import com.ffzone.ffzone_backend.enums.FieldStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FieldRepository extends JpaRepository<Field, UUID> {
    Optional<Field> findByCode(String code);
    boolean existsByCode(String code);
    List<Field> findByStatus(FieldStatus status);
}
