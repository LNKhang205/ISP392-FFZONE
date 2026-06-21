package com.ffzone.ffzone_backend.controller;

import com.ffzone.ffzone_backend.config.VnPayConfig;
import com.ffzone.ffzone_backend.dto.response.PaymentUrlResponse;
import com.ffzone.ffzone_backend.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final VnPayConfig    vnPayConfig;

    /** FE gọi khi user bấm "Thanh toán qua VNPay" — trả về URL để redirect trình duyệt. */
    @PostMapping("/{bookingId}/create-url")
    public ResponseEntity<PaymentUrlResponse> createPaymentUrl(
            @PathVariable UUID bookingId,
            HttpServletRequest request) {
        return ResponseEntity.ok(paymentService.createPaymentUrl(bookingId, request));
    }

    /**
     * VNPay redirect TRÌNH DUYỆT user về đây sau khi thanh toán.
     * CHỈ dùng để hiển thị kết quả cho user — không confirm booking ở đây.
     * Backend xác minh chữ ký rồi redirect tiếp sang trang FE kèm query ?status=success|failed.
     */
    @GetMapping("/vnpay-return")
    public ResponseEntity<Void> handleReturn(@RequestParam Map<String, String> allParams) {
        boolean validSignature = paymentService.verifySignature(allParams);
        String responseCode = allParams.get("vnp_ResponseCode");
        String txnRef = allParams.getOrDefault("vnp_TxnRef", "");

        String status = (validSignature && "00".equals(responseCode)) ? "success" : "failed";

        // Trả bookingCode THẬT (tra từ Payment record) thay vì để FE tự đoán
        // bằng cách tách chuỗi txnRef — tránh phụ thuộc vào format nội bộ.
        String bookingCode = paymentService.resolveBookingCodeFromTxnRef(txnRef);

        String redirectUrl = vnPayConfig.getFrontendResultUrl()
                + "?status=" + status
                + "&bookingCode=" + (bookingCode != null ? bookingCode : "");

        return ResponseEntity.status(302).location(URI.create(redirectUrl)).build();
    }

    /**
     * VNPay SERVER gọi thẳng vào backend (server-to-server) để xác nhận giao dịch.
     * Đây là nguồn xác nhận CHÍNH THỨC — set Payment=PAID, Booking=CONFIRMED.
     * Phải trả về đúng format JSON { "RspCode": "...", "Message": "..." } theo chuẩn VNPay.
     */
    @GetMapping("/vnpay-ipn")
    public ResponseEntity<Map<String, String>> handleIpn(@RequestParam Map<String, String> allParams) {
        Map<String, String> result = paymentService.handleIpn(allParams);
        return ResponseEntity.ok(result);
    }
}