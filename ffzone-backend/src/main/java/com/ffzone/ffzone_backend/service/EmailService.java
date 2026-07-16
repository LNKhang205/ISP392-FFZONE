package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.entity.Booking;
import com.ffzone.ffzone_backend.entity.BookingSlot;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Dịch vụ gửi email thông báo (bất đồng bộ — không block luồng chính).
 * Tất cả method đều @Async nên lỗi email không làm hỏng transaction.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from-name:FFZone Center}")
    private String fromName;

    @Value("${app.mail.from-address:noreply@ffzone.com}")
    private String fromAddress;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    // ── 1. Đăng ký thành công ─────────────────────────────────────────────────

    @Async
    public void sendWelcome(String toEmail, String fullName) {
        String subject = "🎉 Chào mừng bạn đến với FFZone Center!";
        String body = buildHtml(
            "Đăng ký thành công!",
            "Xin chào <strong>" + fullName + "</strong>,",
            "<p>Tài khoản FFZone của bạn đã được tạo thành công.</p>" +
            "<p>Bạn có thể bắt đầu đặt sân ngay bây giờ!</p>",
            "Đặt sân ngay", frontendUrl + "/fields",
            "#10b981"
        );
        send(toEmail, subject, body);
    }

    // ── 2. Đổi mật khẩu thành công ───────────────────────────────────────────

    @Async
    public void sendPasswordChanged(String toEmail, String fullName) {
        String subject = "🔐 Mật khẩu FFZone của bạn đã được thay đổi";
        String body = buildHtml(
            "Mật khẩu đã được cập nhật",
            "Xin chào <strong>" + fullName + "</strong>,",
            "<p>Mật khẩu tài khoản FFZone của bạn vừa được thay đổi thành công.</p>" +
            "<p style='color:#dc2626;'>Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ chúng tôi ngay lập tức.</p>",
            "Đăng nhập", frontendUrl + "/login",
            "#f59e0b"
        );
        send(toEmail, subject, body);
    }

    // ── 2b. Quên mật khẩu — gửi mã OTP ───────────────────────────────────────

    @Async
    public void sendOtpPasswordReset(String toEmail, String fullName, String otpCode, int expiryMinutes) {
        String subject = "🔑 Mã OTP khôi phục mật khẩu FFZone";
        String content =
            "<p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>" +
            "<div style='background:#f8fafc;border-radius:8px;padding:20px;margin:16px 0;text-align:center;'>" +
            "  <p style='margin:0 0 8px;color:#64748b;font-size:0.85em;'>Mã OTP của bạn</p>" +
            "  <p style='margin:0;font-size:2rem;font-weight:700;letter-spacing:6px;color:#3b82f6;'>"
                + otpCode + "</p>" +
            "</div>" +
            "<p>Mã này có hiệu lực trong <strong>" + expiryMinutes + " phút</strong>.</p>" +
            "<p style='color:#dc2626;'>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>";

        String body = buildHtml("Khôi phục mật khẩu 🔑",
            "Xin chào <strong>" + fullName + "</strong>,",
            content,
            "Đặt lại mật khẩu", frontendUrl + "/reset-password",
            "#f59e0b");
        send(toEmail, subject, body);
    }

    // ── 3. Booking CONFIRMED ──────────────────────────────────────────────────

    @Async
    public void sendBookingConfirmed(String toEmail, String fullName,
                                     Booking booking, List<BookingSlot> slots) {
        String subject = "✅ Xác nhận đặt sân thành công — " + booking.getBookingCode();

        StringBuilder slotRows = new StringBuilder();
        for (BookingSlot bs : slots) {
            var fs = bs.getFieldSlot();
            slotRows.append("<tr>")
                .append("<td style='padding:6px 12px;border-bottom:1px solid #f1f5f9;'>")
                .append(fs.getSlotDate().format(DATE_FMT)).append("</td>")
                .append("<td style='padding:6px 12px;border-bottom:1px solid #f1f5f9;'>")
                .append(fs.getStartTime().format(TIME_FMT)).append(" – ")
                .append(fs.getEndTime().format(TIME_FMT)).append("</td>")
                .append("<td style='padding:6px 12px;border-bottom:1px solid #f1f5f9;'>")
                .append(booking.getField().getName()).append("</td>")
                .append("</tr>");
        }

        String content =
            "<p>Booking của bạn đã được <strong style='color:#16a34a;'>xác nhận thành công</strong>.</p>" +
            "<div style='background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;'>" +
            "  <p><strong>Mã đặt sân:</strong> <code style='background:#e2e8f0;padding:2px 8px;border-radius:4px;font-size:1.1em;'>"
                + booking.getBookingCode() + "</code></p>" +
            "  <p><strong>Sân:</strong> " + booking.getField().getName() + "</p>" +
            "  <table style='width:100%;border-collapse:collapse;margin-top:8px;'>" +
            "    <thead><tr>" +
            "      <th style='text-align:left;padding:6px 12px;background:#f1f5f9;font-size:0.85em;color:#64748b;'>Ngày</th>" +
            "      <th style='text-align:left;padding:6px 12px;background:#f1f5f9;font-size:0.85em;color:#64748b;'>Giờ</th>" +
            "      <th style='text-align:left;padding:6px 12px;background:#f1f5f9;font-size:0.85em;color:#64748b;'>Sân</th>" +
            "    </tr></thead><tbody>" + slotRows + "</tbody></table>" +
            "  <p style='margin-top:12px;'><strong>Tổng tiền:</strong> <span style='color:#3b82f6;font-size:1.1em;font-weight:700;'>"
                + formatVnd(booking.getTotalAmount()) + "</span></p>" +
            "</div>" +
            "<p>Vui lòng đến sân đúng giờ và xuất trình <strong>mã đặt sân</strong> hoặc <strong>số điện thoại</strong> cho nhân viên khi check-in.</p>";

        String body = buildHtml("Đặt sân thành công! ⚽",
            "Xin chào <strong>" + fullName + "</strong>,",
            content,
            "Xem chi tiết đặt sân", frontendUrl + "/profile/bookings",
            "#3b82f6");
        send(toEmail, subject, body);
    }

    // ── 4. Booking CANCELLED ──────────────────────────────────────────────────

    @Async
    public void sendBookingCancelled(String toEmail, String fullName,
                                     String bookingCode, String fieldName,
                                     BigDecimal refundAmount, int refundPercent) {
        String subject = "❌ Đơn đặt sân đã bị hủy — " + bookingCode;

        String refundNote = refundPercent == 0
            ? "<p style='color:#dc2626;'>Do hủy trong vòng 6 giờ trước giờ đá, bạn <strong>không được hoàn tiền</strong> theo chính sách.</p>"
            : "<p style='color:#16a34a;'>Bạn sẽ được hoàn <strong>" + refundPercent + "%</strong> — "
                + "<strong>" + formatVnd(refundAmount) + "</strong>. Nhân viên sẽ liên hệ để chuyển khoản.</p>";

        String content =
            "<p>Đơn đặt sân của bạn đã được hủy thành công.</p>" +
            "<div style='background:#fef2f2;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #dc2626;'>" +
            "  <p><strong>Mã đặt sân:</strong> " + bookingCode + "</p>" +
            "  <p><strong>Sân:</strong> " + fieldName + "</p>" +
            "</div>" +
            "<div style='background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;'>" +
            "  <p><strong>Thông tin hoàn tiền:</strong></p>" +
            refundNote +
            "</div>";

        String body = buildHtml("Đơn đặt sân đã hủy",
            "Xin chào <strong>" + fullName + "</strong>,",
            content,
            "Xem lịch sử đặt sân", frontendUrl + "/profile/bookings",
            "#dc2626");
        send(toEmail, subject, body);
    }

    // ── 5. Refund COMPLETED ───────────────────────────────────────────────────

    @Async
    public void sendRefundCompleted(String toEmail, String fullName,
                                    String bookingCode, BigDecimal refundAmount) {
        String subject = "💰 Hoàn tiền thành công — " + bookingCode;
        String content =
            "<p>Chúng tôi đã hoàn tiền thành công cho đơn đặt sân của bạn.</p>" +
            "<div style='background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #16a34a;'>" +
            "  <p><strong>Mã đặt sân:</strong> " + bookingCode + "</p>" +
            "  <p><strong>Số tiền đã hoàn:</strong> <span style='color:#16a34a;font-size:1.2em;font-weight:700;'>"
                + formatVnd(refundAmount) + "</span></p>" +
            "</div>" +
            "<p>Tiền đã được chuyển vào tài khoản ngân hàng bạn đã đăng ký. " +
            "Vui lòng kiểm tra lại trong 1-2 ngày làm việc.</p>";

        String body = buildHtml("Hoàn tiền thành công ✅",
            "Xin chào <strong>" + fullName + "</strong>,",
            content,
            "Xem lịch sử đặt sân", frontendUrl + "/profile/bookings",
            "#10b981");
        send(toEmail, subject, body);
    }

    // ── 6. Survey invitation (sau checkout) ──────────────────────────────────

    @Async
    public void sendSurveyInvitation(String toEmail, String fullName,
                                     String bookingCode, String fieldName) {
        String subject = "⭐ Hãy đánh giá trải nghiệm của bạn tại FFZone!";
        String content =
            "<p>Buổi đá bóng của bạn tại <strong>" + fieldName + "</strong> đã kết thúc.</p>" +
            "<p>Hãy dành 1 phút chia sẻ trải nghiệm để giúp chúng tôi phục vụ bạn tốt hơn.</p>" +
            "<div style='background:#fefce8;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #f59e0b;'>" +
            "  <p>🎁 <strong>Phần thưởng:</strong> Hoàn thành khảo sát và nhận ngay <strong>voucher giảm giá</strong> cho lần đặt sân tiếp theo!</p>" +
            "</div>";

        String body = buildHtml("Đánh giá trải nghiệm của bạn ⭐",
            "Xin chào <strong>" + fullName + "</strong>,",
            content,
            "Làm khảo sát ngay", frontendUrl + "/profile/bookings",
            "#f59e0b");
        send(toEmail, subject, body);
    }

    // ── Gửi email (internal) ──────────────────────────────────────────────────

    private void send(String to, String subject, String htmlBody) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(msg);
            log.info("[Email] Gửi thành công '{}' → {}", subject, to);
        } catch (Exception e) {
            log.error("[Email] Gửi thất bại '{}' → {}: {}", subject, to, e.getMessage());
        }
    }

    // ── HTML template ─────────────────────────────────────────────────────────

    private String buildHtml(String title, String greeting, String content,
                              String btnText, String btnUrl, String accentColor) {
        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
                <tr><td align="center">
                  <table width="600" cellpadding="0" cellspacing="0"
                         style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

                    <!-- Header -->
                    <tr><td style="background:ACCENT_COLOR;padding:28px 32px;">
                      <h1 style="margin:0;color:#fff;font-size:1.4rem;font-weight:700;">⚽ FFZone Center</h1>
                      <p style="margin:6px 0 0;color:rgba(255,255,255,.85);font-size:0.9rem;">TITLE</p>
                    </td></tr>

                    <!-- Body -->
                    <tr><td style="padding:28px 32px;color:#374151;font-size:0.95rem;line-height:1.6;">
                      <p style="margin:0 0 16px;">GREETING</p>
                      CONTENT
                    </td></tr>

                    <!-- CTA Button -->
                    <tr><td style="padding:0 32px 28px;text-align:center;">
                      <a href="BTN_URL"
                         style="display:inline-block;padding:12px 28px;background:ACCENT_COLOR;color:#fff;
                                text-decoration:none;border-radius:8px;font-weight:600;font-size:0.95rem;">
                        BTN_TEXT →
                      </a>
                    </td></tr>

                    <!-- Footer -->
                    <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e5e7eb;
                                   text-align:center;color:#94a3b8;font-size:0.8rem;">
                      <p style="margin:0;">FFZone Center · Hệ thống đặt sân bóng trực tuyến</p>
                      <p style="margin:4px 0 0;">Email này được gửi tự động, vui lòng không trả lời.</p>
                    </td></tr>

                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """
            .replace("ACCENT_COLOR", accentColor)
            .replace("TITLE", title)
            .replace("GREETING", greeting)
            .replace("CONTENT", content)
            .replace("BTN_URL", btnUrl)
            .replace("BTN_TEXT", btnText);
    }

    private String formatVnd(BigDecimal amount) {
        if (amount == null) return "0₫";
        return String.format("%,.0f₫", amount.doubleValue()).replace(",", ".");
    }
}
