package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.request.AccountRequest;
import com.ffzone.ffzone_backend.dto.response.AccountResponse;
import com.ffzone.ffzone_backend.entity.Account;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;

    public List<AccountResponse> findAll() {
        return accountRepository.findAll().stream().map(AccountResponse::from).toList();
    }

    public AccountResponse findById(UUID id) {
        return AccountResponse.from(getOrThrow(id));
    }

    @Transactional
    public AccountResponse create(AccountRequest req) {
        if (accountRepository.existsByEmail(req.getEmail()))
            throw AppException.conflict("Email đã tồn tại");
        if (req.getPhone() != null && accountRepository.existsByPhone(req.getPhone()))
            throw AppException.conflict("Số điện thoại đã tồn tại");

        Account account = Account.builder()
            .fullName(req.getFullName())
            .email(req.getEmail())
            .phone(req.getPhone())
            .passwordHash(passwordEncoder.encode(req.getPassword()))
            .role(req.getRole() != null ? req.getRole() : com.ffzone.ffzone_backend.enums.AccountRole.USER)
            .avatarUrl(req.getAvatarUrl())
            .isActive(true)
            .build();
        return AccountResponse.from(accountRepository.save(account));
    }

    @Transactional
    public AccountResponse update(UUID id, AccountRequest req) {
        Account account = getOrThrow(id);
        if (req.getFullName() != null) account.setFullName(req.getFullName());
        if (req.getAvatarUrl() != null) account.setAvatarUrl(req.getAvatarUrl());
        if (req.getIsActive() != null) account.setIsActive(req.getIsActive());
        if (req.getRole() != null) account.setRole(req.getRole());
        return AccountResponse.from(accountRepository.save(account));
    }

    @Transactional
    public void deactivate(UUID id) {
        Account account = getOrThrow(id);
        account.setIsActive(false);
        accountRepository.save(account);
    }

    private Account getOrThrow(UUID id) {
        return accountRepository.findById(id)
            .orElseThrow(() -> AppException.notFound("Tài khoản không tồn tại: " + id));
    }
}
