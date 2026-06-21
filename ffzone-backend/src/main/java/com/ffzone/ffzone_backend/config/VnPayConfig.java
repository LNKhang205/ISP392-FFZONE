package com.ffzone.ffzone_backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Đọc cấu hình VNPay từ application.properties, prefix "vnpay.".
 * Cần điền vào application.properties (lấy từ email đăng ký Sandbox):
 *
 *   vnpay.tmn-code=YOUR_TMN_CODE
 *   vnpay.hash-secret=YOUR_HASH_SECRET
 *   vnpay.pay-url=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
 *   vnpay.return-url=http://localhost:5173/payment-result
 *   vnpay.ipn-url=http://localhost:8080/api/payments/vnpay-ipn
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "vnpay")
public class VnPayConfig {
    private String tmnCode;
    private String hashSecret;
    private String payUrl;

    /**
     * URL gửi cho VNPay làm vnp_ReturnUrl — PHẢI trỏ vào BACKEND
     * (PaymentController.handleReturn), không phải frontend trực tiếp.
     * VNPay redirect trình duyệt user về đây trước để backend verify chữ ký,
     * rồi backend mới redirect tiếp sang frontendResultUrl.
     * Ví dụ: http://localhost:8080/api/payments/vnpay-return
     */
    private String backendReturnUrl;

    /**
     * Trang FE hiển thị kết quả thanh toán cho user xem — KHÔNG gửi cho VNPay,
     * chỉ dùng nội bộ trong PaymentController để redirect bước cuối.
     * Ví dụ: http://localhost:5173/payment-result
     */
    private String frontendResultUrl;

    private String ipnUrl;
    private String version = "2.1.0";
    private String command = "pay";
    private String currCode = "VND";
    private String locale = "vn";
}