package com.ffzone.ffzone_backend.repository;

import com.ffzone.ffzone_backend.entity.FieldSlot;
import com.ffzone.ffzone_backend.enums.SlotStatus;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FieldSlotRepository extends JpaRepository<FieldSlot, UUID> {
    List<FieldSlot> findBySlotDateOrderByStartTime(LocalDate slotDate);
    List<FieldSlot> findByFieldIdAndSlotDate(UUID fieldId, LocalDate slotDate);
    List<FieldSlot> findByFieldIdAndSlotDateAndStatus(UUID fieldId, LocalDate slotDate, SlotStatus status);
    boolean existsByFieldIdAndSlotDate(UUID fieldId, LocalDate slotDate);
    boolean existsByFieldIdAndSlotDateAndStartTime(UUID fieldId, LocalDate slotDate, java.time.LocalTime startTime);

    @Modifying
    @Transactional
    void deleteByFieldIdAndSlotDateAndStatus(
            UUID fieldId,
            LocalDate slotDate,
            SlotStatus status
    );

    @Lock(LockModeType.OPTIMISTIC)
    @Query("SELECT s FROM FieldSlot s WHERE s.id = :id")
    Optional<FieldSlot> findByIdWithLock(@Param("id") UUID id);

    @Query("SELECT s FROM FieldSlot s WHERE s.field.id = :fieldId AND s.slotDate BETWEEN :from AND :to ORDER BY s.slotDate, s.startTime")
    List<FieldSlot> findByFieldIdAndDateRange(@Param("fieldId") UUID fieldId, @Param("from") LocalDate from, @Param("to") LocalDate to);
}
