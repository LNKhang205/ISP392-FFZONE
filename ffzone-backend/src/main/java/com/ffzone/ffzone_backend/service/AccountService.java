package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.request.AccountRequest;
import com.ffzone.ffzone_backend.dto.request.ChangePasswordRequest;
import com.ffzone.ffzone_backend.dto.request.UpdateProfileRequest;
import com.ffzone.ffzone_backend.dto.response.AccountResponse;
import com.ffzone.ffzone_backend.entity.Account;
import com.ffzone.ffzone_backend.enums.AuthProvider;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    private static final List<String> ALLOWED_AVATAR_EXTENSIONS = List.of(".jpg", ".jpeg", ".png", ".gif", ".webp");
    private static final String AVATAR_PUBLIC_URL_PREFIX = "uploads/avatars/";

    @Value("${app.upload.avatars-dir:uploads/avatars}")
    private String avatarsDir;

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

    // ── My Profile (self-service, CUSTOMER/USER only — enforced at controller) ──
    @Transactional
    public AccountResponse updateMyProfile(Account current, UpdateProfileRequest req) {
        Account account = getOrThrow(current.getId());

        if (req.getFullName() != null) account.setFullName(req.getFullName());
        if (req.getGender() != null) account.setGender(req.getGender());
        if (req.getDateOfBirth() != null) account.setDateOfBirth(req.getDateOfBirth());
        if (req.getAvatarUrl() != null) account.setAvatarUrl(req.getAvatarUrl());

        if (req.getPhone() != null && !req.getPhone().equals(account.getPhone())) {
            if (accountRepository.existsByPhone(req.getPhone()))
                throw AppException.conflict("Số điện thoại đã được sử dụng");
            account.setPhone(req.getPhone());
        }

        return AccountResponse.from(accountRepository.save(account));
    }

    @Transactional
    public void changePassword(Account current, ChangePasswordRequest req) {
        Account account = getOrThrow(current.getId());

        if (account.getProvider() == AuthProvider.GOOGLE)
            throw AppException.forbidden("Tài khoản Google không thể đổi mật khẩu");

        if (account.getPasswordHash() == null
                || !passwordEncoder.matches(req.getCurrentPassword(), account.getPasswordHash()))
            throw AppException.badRequest("Mật khẩu hiện tại không đúng");

        if (req.getNewPassword().equals(req.getCurrentPassword()))
            throw AppException.badRequest("Mật khẩu mới phải khác mật khẩu hiện tại");

        if (!req.getNewPassword().equals(req.getConfirmPassword()))
            throw AppException.badRequest("Xác nhận mật khẩu không khớp");

        account.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        accountRepository.save(account);

        emailService.sendPasswordChanged(account.getEmail(), account.getFullName());
    }

    @Transactional
    public AccountResponse uploadMyAvatar(Account current, MultipartFile file) {
        if (file == null || file.isEmpty())
            throw AppException.badRequest("Avatar file is required");

        Account account = getOrThrow(current.getId());

        String lower = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        String extension = ALLOWED_AVATAR_EXTENSIONS.stream()
            .filter(lower::endsWith)
            .findFirst()
            .orElseThrow(() -> AppException.badRequest("Only jpg, jpeg, png, gif, and webp images are allowed"));

        String fileName = UUID.randomUUID() + extension;
        Path uploadDir = Paths.get(avatarsDir).toAbsolutePath().normalize();
        Path target = uploadDir.resolve(fileName).normalize();
        if (!target.startsWith(uploadDir))
            throw AppException.badRequest("Invalid upload path");

        try {
            Files.createDirectories(uploadDir);
            file.transferTo(target);
        } catch (IOException ex) {
            throw new AppException("Could not store avatar file", HttpStatus.INTERNAL_SERVER_ERROR);
        }

        account.setAvatarUrl(AVATAR_PUBLIC_URL_PREFIX + fileName);
        return AccountResponse.from(accountRepository.save(account));
    }

    private Account getOrThrow(UUID id) {
        return accountRepository.findById(id)
            .orElseThrow(() -> AppException.notFound("Tài khoản không tồn tại: " + id));
    }
}
