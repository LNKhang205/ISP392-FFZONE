package com.ffzone.ffzone_backend.repository;

import com.ffzone.ffzone_backend.entity.UserVoucher;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserVoucherRepository extends JpaRepository<UserVoucher, UUID> {
    List<UserVoucher> findByAccountId(UUID accountId);
    Optional<UserVoucher> findByAccountIdAndVoucherId(UUID accountId, UUID voucherId);
    boolean existsByAccountIdAndVoucherId(UUID accountId, UUID voucherId);
    List<UserVoucher> findByAccountIdAndIsUsed(UUID accountId, Boolean isUsed);
}
