package com.ffzone.ffzone_backend.repository;

import com.ffzone.ffzone_backend.entity.UserVoucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserVoucherRepository extends JpaRepository<UserVoucher, UUID> {
    Optional<UserVoucher> findByAccountIdAndVoucherId(UUID accountId, UUID voucherId);
    boolean existsByAccountIdAndVoucherId(UUID accountId, UUID voucherId);
    List<UserVoucher> findByAccountIdAndIsUsed(UUID accountId, Boolean isUsed);

    @Query("SELECT uv FROM UserVoucher uv JOIN FETCH uv.voucher WHERE uv.account.id = :accountId")
    List<UserVoucher> findByAccountId(@Param("accountId") UUID accountId);
}