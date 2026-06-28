package com.ffzone.ffzone_backend.repository;

import com.ffzone.ffzone_backend.entity.Voucher;
import com.ffzone.ffzone_backend.enums.VoucherStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;

public interface VoucherRepository extends JpaRepository<Voucher, UUID> {
    Optional<Voucher> findByCode(String code);
    boolean existsByCode(String code);
    List<Voucher> findByStatus(VoucherStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM Voucher v WHERE v.id = :id")
    Optional<Voucher> findByIdWithLock(@Param("id") UUID id);
    @Query("""
        SELECT v FROM Voucher v
        WHERE v.status = 'ACTIVE'
          AND v.startDate <= :now
          AND v.endDate >= :now
          AND v.usedQuantity < v.quantity
    """)
    List<Voucher> findAvailable(@org.springframework.data.repository.query.Param("now") LocalDateTime now);
}
