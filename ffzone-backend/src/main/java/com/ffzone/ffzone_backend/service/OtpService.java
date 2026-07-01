package com.ffzone.ffzone_backend.service;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class OtpService {

    private static final int OTP_EXPIRY_MINUTES = 10;
    private final Map<String, OtpData> otpStorage = new ConcurrentHashMap<>();
    private final Random random = new Random();

    @Getter
    @AllArgsConstructor
    private static class OtpData {
        private final String code;
        private final LocalDateTime expiryTime;
    }

    public String generateOtp(String email) {
        String code = String.format("%06d", random.nextInt(1000000));
        LocalDateTime expiryTime = LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES);
        otpStorage.put(email, new OtpData(code, expiryTime));
        
        log.info("========================================");
        log.info("Gửi OTP khôi phục mật khẩu tới email: {}", email);
        log.info("Mã OTP của bạn: {}", code);
        log.info("Mã này có hiệu lực trong {} phút (đến {})", OTP_EXPIRY_MINUTES, expiryTime);
        log.info("========================================");
        
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
