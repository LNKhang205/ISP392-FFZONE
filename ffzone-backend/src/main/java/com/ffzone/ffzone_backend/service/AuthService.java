package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.request.LoginRequest;
import com.ffzone.ffzone_backend.dto.request.RegisterRequest;
import com.ffzone.ffzone_backend.dto.response.AccountResponse;
import com.ffzone.ffzone_backend.dto.response.AuthResponse;
import com.ffzone.ffzone_backend.entity.Account;
import com.ffzone.ffzone_backend.enums.AccountRole;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.AccountRepository;
import com.ffzone.ffzone_backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class AuthService {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthResponse login(LoginRequest req) {
        Account account = accountRepository.findByEmail(req.getEmail())
            .orElseThrow(() -> AppException.badRequest("Email hoặc mật khẩu không đúng"));

        if (!account.getIsActive())
            throw AppException.forbidden("Tài khoản đã bị khóa");

        if (!passwordEncoder.matches(req.getPassword(), account.getPasswordHash()))
            throw AppException.badRequest("Email hoặc mật khẩu không đúng");

        String token = jwtUtil.generateToken(
            account.getEmail(),
            account.getRole().name(),
            account.getId().toString()
        );

        return AuthResponse.builder()
            .token(token)
            .tokenType("Bearer")
            .user(AccountResponse.from(account))
            .build();
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (accountRepository.existsByEmail(req.getEmail()))
            throw AppException.conflict("Email đã được sử dụng");

        if (accountRepository.existsByPhone(req.getPhone()))
            throw AppException.conflict("Số điện thoại đã được sử dụng");

        Account account = Account.builder()
            .fullName(req.getFullName())
            .email(req.getEmail())
            .phone(req.getPhone())
            .passwordHash(passwordEncoder.encode(req.getPassword()))
            .role(AccountRole.USER)
            .isActive(true)
            .build();

        account = accountRepository.save(account);

        String token = jwtUtil.generateToken(
            account.getEmail(),
            account.getRole().name(),
            account.getId().toString()
        );

        return AuthResponse.builder()
            .token(token)
            .tokenType("Bearer")
            .user(AccountResponse.from(account))
            .build();
    }

    public AccountResponse me(Account account) {
        return AccountResponse.from(account);
    }
}
