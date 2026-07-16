package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.request.ForgotPasswordRequest;
import com.ffzone.ffzone_backend.dto.request.LoginRequest;
import com.ffzone.ffzone_backend.dto.request.RegisterRequest;
import com.ffzone.ffzone_backend.dto.request.ResetPasswordRequest;
import com.ffzone.ffzone_backend.dto.response.AccountResponse;
import com.ffzone.ffzone_backend.dto.response.AuthResponse;
import com.ffzone.ffzone_backend.entity.Account;
import com.ffzone.ffzone_backend.enums.AccountRole;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.AccountRepository;
import com.ffzone.ffzone_backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final OtpService otpService;
    private final EmailService emailService;

    public AuthResponse login(LoginRequest req) {
        Account account = accountRepository.findByEmail(req.getEmail())
            .orElseThrow(() -> AppException.badRequest("Email hoặc mật khẩu không đúng"));

        if (!account.getIsActive())
            throw AppException.forbidden("Tài khoản đã bị khóa");

        // Google-only accounts have no password
        if (account.getPasswordHash() == null)
            throw AppException.badRequest("Tài khoản này đăng nhập bằng Google. Vui lòng dùng 'Tiếp tục với Google'.");

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

        emailService.sendWelcome(account.getEmail(), account.getFullName());

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
        if (account == null) {
            throw AppException.notFound("Tài khoản không tồn tại hoặc chưa đăng nhập");
        }
        return AccountResponse.from(account);
    }

    public void logout(Account account) {
        if (account != null) {
            log.info("Người dùng {} đã đăng xuất hệ thống", account.getEmail());
        }
    }

    public void forgotPassword(ForgotPasswordRequest req) {
        Account account = accountRepository.findByEmail(req.getEmail())
            .orElseThrow(() -> AppException.notFound("Email không tồn tại trong hệ thống"));

        if (account.getPasswordHash() == null) {
            throw AppException.badRequest("Tài khoản này đăng nhập bằng Google. Vui lòng dùng 'Tiếp tục với Google'.");
        }

        otpService.generateOtp(account.getEmail(), account.getFullName());
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        Account account = accountRepository.findByEmail(req.getEmail())
            .orElseThrow(() -> AppException.notFound("Email không tồn tại trong hệ thống"));

        boolean isValid = otpService.validateOtp(req.getEmail(), req.getOtp());
        if (!isValid) {
            throw AppException.badRequest("Mã OTP không chính xác hoặc đã hết hạn");
        }

        account.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        accountRepository.save(account);
        log.info("Đặt lại mật khẩu thành công cho email: {}", req.getEmail());

        emailService.sendPasswordChanged(account.getEmail(), account.getFullName());
    }
}
