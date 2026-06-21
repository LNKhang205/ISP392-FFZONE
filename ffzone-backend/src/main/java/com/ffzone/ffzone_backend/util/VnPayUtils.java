package com.ffzone.ffzone_backend.util;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Map;
import java.util.TreeMap;

/**
 * Helper ký HMAC-SHA512 và build query string theo chuẩn VNPay.
 * Tham khảo: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 */
public final class VnPayUtils {

    private VnPayUtils() {}

    /** Sắp xếp params theo key (TreeMap tự sort), build query KHÔNG kèm hash — dùng để ký. */
    public static String buildHashData(Map<String, String> params) {
        TreeMap<String, String> sorted = new TreeMap<>(params);
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (Map.Entry<String, String> e : sorted.entrySet()) {
            if (e.getValue() == null || e.getValue().isEmpty()) continue;
            if (!first) sb.append('&');
            sb.append(URLEncoder.encode(e.getKey(), StandardCharsets.US_ASCII))
              .append('=')
              .append(URLEncoder.encode(e.getValue(), StandardCharsets.US_ASCII));
            first = false;
        }
        return sb.toString();
    }

    /** HMAC-SHA512 ký chuỗi data bằng secretKey, trả về hex string viết hoa... (VNPay không quan tâm hoa/thường nhưng giữ chuẩn lowercase hex). */
    public static String hmacSHA512(String secretKey, String data) {
        try {
            Mac hmac512 = Mac.getInstance("HmacSHA512");
            SecretKeySpec keySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            hmac512.init(keySpec);
            byte[] result = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : result) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi ký HMAC-SHA512: " + e.getMessage(), e);
        }
    }

    /** Sinh chuỗi random alphanumeric — dùng cho vnp_TxnRef nếu cần thêm entropy. */
    public static String randomAlphaNumeric(int length) {
        String chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }

    /** Lấy IP client thực tế, fallback "127.0.0.1" nếu không xác định được (chạy local). */
    public static String getClientIp(jakarta.servlet.http.HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip == null || ip.isBlank() || ip.equals("0:0:0:0:0:0:0:1")) {
            ip = "127.0.0.1";
        }
        // X-Forwarded-For có thể chứa nhiều IP cách nhau dấu phẩy — lấy IP đầu tiên
        if (ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
