package com.ffzone.ffzone_backend.repository;

import com.ffzone.ffzone_backend.entity.FieldPricing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FieldPricingRepository extends JpaRepository<FieldPricing, UUID> {
    List<FieldPricing> findByFieldIdAndIsActive(UUID fieldId, Boolean isActive);
    List<FieldPricing> findByIsActive(Boolean isActive);
    Optional<FieldPricing> findFirstByFieldIdAndDayOfWeekAndIsActiveOrderByEffectiveFromDesc(UUID fieldId, String dayOfWeek, Boolean isActive);

    @Query("""
        SELECT p FROM FieldPricing p
        WHERE p.field.id = :fieldId
          AND p.dayOfWeek = :dayOfWeek
          AND p.startTime <= :time AND p.endTime > :time
          AND p.isActive = true
          AND (p.effectiveTo IS NULL OR p.effectiveTo >= :date)
          AND p.effectiveFrom <= :date
        ORDER BY p.effectiveFrom DESC
    """)
    Optional<FieldPricing> findActivePrice(
        @Param("fieldId") UUID fieldId,
        @Param("dayOfWeek") String dayOfWeek,
        @Param("time") LocalTime time,
        @Param("date") LocalDate date
    );
}
