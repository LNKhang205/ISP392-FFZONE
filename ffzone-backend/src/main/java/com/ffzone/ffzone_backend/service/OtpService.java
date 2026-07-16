package com.ffzone.ffzone_backend.service;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
@RequiredArgsConstructor
public class OtpService {

    private final EmailService emailService;

    private static final int OTP_EXPIRY_MINUTES = 10;
    private final Map<String, OtpData> otpStorage = new ConcurrentHashMap<>();
    private final Random random = new Random();

    @Getter
    @AllArgsConstructor
    private static class OtpData {
        private final String code;
        private final LocalDateTime expiryTime;
    }

    /** Sinh OTP và gửi qua email. {@code fullName} dùng để cá nhân hóa email. */
    public String generateOtp(String email, String fullName) {
        String code = String.format("%06d", random.nextInt(1000000));
        LocalDateTime expiryTime = LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES);
        otpStorage.put(email, new OtpData(code, expiryTime));

        log.info("Đã sinh OTP khôi phục mật khẩu cho email: {} (hết hạn lúc {})", email, expiryTime);
        emailService.sendOtpPasswordReset(email, fullName, code, OTP_EXPIRY_MINUTES);

        return code;
    }

    public boolean validateOtp(String email, String code) {
        OtpData data = otpStorage.get(email);
        if (data == null) {
            log.warn("Không tìm thấy yêu cầu OTP cho email: {}", email);
            return false;
        }

        if (LocalDateTime.now().isAfter(data.getExpiryTime())) {
            log.warn("Mã OTP cho email {} đã hết hạn", email);
            otpStorage.remove(email);
            return false;
        }

        boolean isValid = data.getCode().equals(code);
        if (isValid) {
            otpStorage.remove(email);
            log.info("Xác thực OTP thành công cho email: {}", email);
        } else {
            log.warn("Xác thực OTP thất bại cho email: {} (Nhập sai mã)", email);
        }
        
        return isValid;
    }
}
