package com.ffzone.ffzone_backend.repository;

import com.ffzone.ffzone_backend.entity.Account;
import com.ffzone.ffzone_backend.enums.AccountRole;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccountRepository extends JpaRepository<Account, UUID> {
    Optional<Account> findByEmail(String email);
    Optional<Account> findByPhone(String phone);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
    List<Account> findByRole(AccountRole role);
    List<Account> findByIsActive(Boolean isActive);
}
