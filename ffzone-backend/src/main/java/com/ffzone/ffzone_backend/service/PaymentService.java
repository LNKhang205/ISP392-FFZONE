package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.config.VnPayConfig;
import com.ffzone.ffzone_backend.dto.response.PaymentUrlResponse;
import com.ffzone.ffzone_backend.entity.Booking;
import com.ffzone.ffzone_backend.entity.BookingSlot;
import com.ffzone.ffzone_backend.entity.FieldSlot;
import com.ffzone.ffzone_backend.entity.Payment;
import com.ffzone.ffzone_backend.enums.BookingStatus;
import com.ffzone.ffzone_backend.enums.PaymentStatus;
import com.ffzone.ffzone_backend.enums.SlotStatus;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.BookingRepository;
import com.ffzone.ffzone_backend.repository.BookingSlotRepository;
import com.ffzone.ffzone_backend.repository.FieldSlotRepository;
import com.ffzone.ffzone_backend.repository.PaymentRepository;
import com.ffzone.ffzone_backend.util.VnPayUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Xử lý tích hợp thanh toán VNPay Sandbox.
 *
 * Quy tắc thời gian (BR-27): TOÀN BỘ flow từ lúc tạo booking tới lúc thanh toán
 * xong chỉ có 10 PHÚT — không tách 5 phút đặt + 5 phút thanh toán riêng.
 * vnp_ExpireDate luôn = booking.paymentDeadline (thời điểm khóa slot hết hạn),
 * KHÔNG hardcode cố định.
 *
 * Flow (theo SRS function 3.3.2 + BR-40 đến BR-46):
 * 1. createPaymentUrl() -> FE gọi khi user bấm "Pay via VNPay", trả về URL
 * redirect.
 * 2. handleReturn() -> VNPay redirect TRÌNH DUYỆT user về sau khi thanh toán.
 * Chỉ dùng để HIỂN THỊ kết quả — KHÔNG dùng để confirm booking
 * (vì có thể bị user tắt tab giữa chừng / giả mạo URL).
 * 3. handleIpn() -> VNPay SERVER gọi thẳng vào BACKEND (server-to-server).
 * Đây là nguồn xác nhận chính thức — set Payment=PAID, Booking=CONFIRMED.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final VnPayConfig vnPayConfig;
    private final BookingRepository bookingRepository;
    private final BookingSlotRepository bookingSlotRepository;
    private final FieldSlotRepository fieldSlotRepository;
    private final PaymentRepository paymentRepository;
    private final EmailService emailService;

    private static final DateTimeFormatter VNP_DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    // ── 1. Tạo URL thanh toán (booking gốc - PENDING_PAYMENT) ───────────────────

    @Transactional
    public PaymentUrlResponse createPaymentUrl(UUID bookingId, HttpServletRequest httpRequest) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> AppException.notFound("Booking không tồn tại: " + bookingId));

        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT)
            throw AppException.badRequest("Booking không ở trạng thái chờ thanh toán");

        if (booking.getPaymentDeadline() != null && LocalDateTime.now().isAfter(booking.getPaymentDeadline()))
            throw AppException.badRequest("Booking đã hết hạn thanh toán, vui lòng đặt lại");

        long amountVnd = booking.getTotalAmount().longValueExact();
        if (amountVnd <= 0)
            throw AppException.badRequest("Số tiền thanh toán không hợp lệ");

        String txnRef = booking.getBookingCode() + "-" + System.currentTimeMillis();

        Payment payment = paymentRepository.findByBookingId(bookingId)
                .orElseGet(() -> Payment.builder().booking(booking).build());
        payment.setAmount(booking.getTotalAmount());
        payment.setPaymentMethod("VNPAY");
        payment.setStatus(PaymentStatus.PENDING);
        payment.setVnpTxnRef(txnRef);
        paymentRepository.save(payment);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expireDate = booking.getPaymentDeadline() != null
                ? booking.getPaymentDeadline()
                : now.plusMinutes(10);
        if (expireDate.isBefore(now.plusMinutes(1))) expireDate = now.plusMinutes(1);

        return buildPaymentUrl(booking, txnRef, amountVnd, now, expireDate, httpRequest,
                "Thanh toan booking " + booking.getBookingCode());
    }

    /**
     * Tạo URL thanh toán VNPay cho dịch vụ bổ sung tại sân (CONFIRMED / IN_PROGRESS).
     * payAmount được tính chính xác từ addServicesAtVenue — chỉ tiền dịch vụ mới và discount mới,
     * KHÔNG bao gồm tiền sân đã thanh toán trước đó.
     */
    @Transactional
    public PaymentUrlResponse createAddonPaymentUrl(UUID bookingId, BigDecimal payAmount, HttpServletRequest httpRequest) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> AppException.notFound("Booking không tồn tại: " + bookingId));

        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.IN_PROGRESS)
            throw AppException.badRequest("Booking không ở trạng thái cho phép thanh toán dịch vụ bổ sung");

        if (payAmount == null || payAmount.compareTo(BigDecimal.ZERO) <= 0)
            throw AppException.badRequest("Số tiền dịch vụ không hợp lệ");

        long amountVnd = payAmount.longValue();
        String txnRef = booking.getBookingCode() + "-SVC-" + System.currentTimeMillis();

        // Upsert payment record (1 payment per booking — cập nhật với amount dịch vụ mới)
        Payment payment = paymentRepository.findByBookingId(bookingId)
                .orElseGet(() -> Payment.builder().booking(booking).build());
        payment.setAmount(payAmount);
        payment.setPaymentMethod("VNPAY");
        payment.setStatus(PaymentStatus.PENDING);
        payment.setVnpTxnRef(txnRef);
        paymentRepository.save(payment);

        LocalDateTime now = LocalDateTime.now();
        log.info("[Payment] Tạo addon payment URL cho booking {} - txnRef={} - amount={}đ",
                booking.getBookingCode(), txnRef, amountVnd);

        return buildPaymentUrl(booking, txnRef, amountVnd, now, now.plusMinutes(10), httpRequest,
                "Thanh toan dich vu bo sung " + booking.getBookingCode());
    }

    /** Tạo VNPay URL dùng chung cho cả booking gốc và addon. */
    private PaymentUrlResponse buildPaymentUrl(Booking booking, String txnRef, long amountVnd,
            LocalDateTime now, LocalDateTime expireDate, HttpServletRequest httpRequest, String orderInfo) {
        Map<String, String> params = new HashMap<>();
        params.put("vnp_Version", vnPayConfig.getVersion());
        params.put("vnp_Command", vnPayConfig.getCommand());
        params.put("vnp_TmnCode", vnPayConfig.getTmnCode());
        params.put("vnp_Amount", String.valueOf(amountVnd * 100));
        params.put("vnp_CurrCode", vnPayConfig.getCurrCode());
        params.put("vnp_TxnRef", txnRef);
        params.put("vnp_OrderInfo", orderInfo);
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", vnPayConfig.getLocale());
        params.put("vnp_ReturnUrl", vnPayConfig.getBackendReturnUrl());
        params.put("vnp_IpAddr", VnPayUtils.getClientIp(httpRequest));
        params.put("vnp_CreateDate", now.format(VNP_DATE_FMT));
        params.put("vnp_ExpireDate", expireDate.format(VNP_DATE_FMT));

        String hashData = VnPayUtils.buildHashData(params);
        String secureHash = VnPayUtils.hmacSHA512(vnPayConfig.getHashSecret(), hashData);
        String paymentUrl = vnPayConfig.getPayUrl() + "?" + hashData + "&vnp_SecureHash=" + secureHash;

        return PaymentUrlResponse.builder()
                .paymentUrl(paymentUrl)
                .bookingCode(booking.getBookingCode())
                .vnpTxnRef(txnRef)
                .build();
    }

    // ── 2. Return URL (chỉ hiển thị, KHÔNG confirm booking) ─────────────────

    /**
     * Tra cứu bookingCode thật từ Payment record theo vnp_TxnRef.
     * Dùng cho Return URL — đáng tin cậy hơn so với FE tự tách chuỗi txnRef
     * (txnRef có dạng "{bookingCode}-{timestamp}" nhưng KHÔNG nên coi đó là
     * hợp đồng cố định ở phía FE).
     */
    @Transactional
    public String resolveBookingCodeFromTxnRef(String txnRef) {
        return paymentRepository.findByVnpTxnRef(txnRef)
                .map(p -> p.getBooking().getBookingCode())
                .orElse(null);
    }

    /**
     * Xác minh chữ ký của VNPay Return URL. Trả về true/false để Controller
     * quyết định redirect FE tới trang success/fail. KHÔNG thay đổi DB ở đây.
     */
    public boolean verifySignature(Map<String, String> vnpParams) {
        String receivedHash = vnpParams.get("vnp_SecureHash");
        if (receivedHash == null)
            return false;

        Map<String, String> filtered = new HashMap<>(vnpParams);
        filtered.remove("vnp_SecureHash");
        filtered.remove("vnp_SecureHashType");

        String hashData = VnPayUtils.buildHashData(filtered);
        String calculatedHash = VnPayUtils.hmacSHA512(vnPayConfig.getHashSecret(), hashData);

        return calculatedHash.equalsIgnoreCase(receivedHash);
    }

    // ── 3. IPN (nguồn xác nhận chính thức — BR-43, BR-44) ───────────────────

    /**
     * Xử lý IPN callback từ VNPay server. Trả về (RspCode, Message) theo đúng
     * format VNPay yêu cầu để VNPay biết server đã nhận xử lý xong, tránh bị
     * VNPay retry liên tục.
     */
    @Transactional
    public Map<String, String> handleIpn(Map<String, String> vnpParams) {
        Map<String, String> response = new HashMap<>();

        // 1. Xác minh chữ ký trước tiên — không tin bất kỳ field nào nếu hash sai
        if (!verifySignature(vnpParams)) {
            log.warn("[Payment IPN] Chữ ký không hợp lệ: {}", vnpParams);
            response.put("RspCode", "97");
            response.put("Message", "Invalid Signature");
            return response;
        }

        String txnRef = vnpParams.get("vnp_TxnRef");
        String responseCode = vnpParams.get("vnp_ResponseCode");
        String transactionNo = vnpParams.get("vnp_TransactionNo");
        String vnpAmount = vnpParams.get("vnp_Amount");

        Payment payment = paymentRepository.findByVnpTxnRef(txnRef).orElse(null);
        if (payment == null) {
            log.warn("[Payment IPN] Không tìm thấy payment cho txnRef={}", txnRef);
            response.put("RspCode", "01");
            response.put("Message", "Order not found");
            return response;
        }

        // Idempotency: nếu đã xử lý PAID rồi thì trả OK luôn, không xử lý lại (tránh
        // double-confirm)
        if (payment.getStatus() == PaymentStatus.PAID) {
            response.put("RspCode", "00");
            response.put("Message", "Confirm Success");
            return response;
        }

        Booking booking = payment.getBooking();

        // Validate số tiền khớp (chống giả mạo IPN với amount khác)
        // Dùng payment.getAmount() vì đây là số tiền thực sự được charge
        // (với dịch vụ bổ sung = serviceAmount, với booking gốc = totalAmount)
        long expectedAmount = payment.getAmount().longValue() * 100;
        if (vnpAmount == null || Long.parseLong(vnpAmount) != expectedAmount) {
            log.warn("[Payment IPN] Số tiền không khớp: expected={} got={}", expectedAmount, vnpAmount);
            response.put("RspCode", "04");
            response.put("Message", "Invalid Amount");
            return response;
        }

        payment.setVnpResponseCode(responseCode);
        payment.setVnpTransactionNo(transactionNo);

        if ("00".equals(responseCode)) {
            // ── Thanh toán thành công ──
            payment.setStatus(PaymentStatus.PAID);
            payment.setPaidAt(LocalDateTime.now());
            paymentRepository.save(payment);

            if (booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
                booking.setStatus(BookingStatus.CONFIRMED);
                bookingRepository.save(booking);

                // Slot: PENDING -\u003e OCCUPIED (đã thanh toán xong, chính thức giữ chỗ)
                List<BookingSlot> bookingSlots = bookingSlotRepository.findByBookingId(booking.getId());
                for (BookingSlot bs : bookingSlots) {
                    FieldSlot slot = bs.getFieldSlot();
                    slot.setStatus(SlotStatus.OCCUPIED);
                    fieldSlotRepository.save(slot);
                }

                emailService.sendBookingConfirmed(
                    booking.getAccount().getEmail(),
                    booking.getAccount().getFullName(),
                    booking,
                    bookingSlots
                );
            }
            // Nếu booking đã CONFIRMED/IN_PROGRESS: đây là thanh toán dịch vụ bổ sung
            // → không đổi status, không gửi email xác nhận lại

            log.info("[Payment IPN] Thanh toán thành công booking {} - txnRef={}",
                    booking.getBookingCode(), txnRef);
        } else {
            // ── Thanh toán thất bại ──
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);

            log.info("[Payment IPN] Thanh toán thất bại booking {} - txnRef={} - code={}",
                    booking.getBookingCode(), txnRef, responseCode);
            // Không tự hủy booking ở đây — để slot tiếp tục PENDING tới khi
            // payment_deadline hết hạn, scheduler sẽ tự release (cho phép user thử lại).
        }

        response.put("RspCode", "00");
        response.put("Message", "Confirm Success");
        return response;
    }
}