package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.request.CreateBookingRequest;
import com.ffzone.ffzone_backend.dto.response.BookingResponse;
import com.ffzone.ffzone_backend.entity.*;
import com.ffzone.ffzone_backend.enums.BookingStatus;
import com.ffzone.ffzone_backend.enums.SlotStatus;
import com.ffzone.ffzone_backend.enums.VoucherType;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Random;
import java.util.UUID;

/**
 * Logic nghiệp vụ chính cho Booking — KHÔNG phải entity Booking.
 * Quản lý: tạo booking + lock slot, hủy booking + tính refund, gia hạn slot, query.
 *
 * Quy tắc áp dụng theo SRS:
 * - BR-25: 1 booking đặt tối đa 3 slot liên tiếp cùng 1 sân.
 * - BR-26: không cho phép 2 booking trùng field_slot_id (DB UNIQUE trên booking_slots.field_slot_id
 *          + check slot.status = AVAILABLE trước khi book).
 * - BR-27: khóa slot ĐÚNG 10 PHÚT chờ thanh toán (payment_deadline) — tổng thời
 *          gian cho cả việc chọn dịch vụ lẫn thanh toán, KHÔNG tách 5+5.
 *          Slot chuyển AVAILABLE -> PENDING ngay khi tạo booking.
 * - BR-48 / BR-49: hủy >=6h trước giờ đá thì hoàn 100%, ngược lại 0%.
 * - BR-78: discount_amount không được vượt quá field_amount.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BookingFlowService {

    private final BookingRepository      bookingRepository;
    private final BookingSlotRepository  bookingSlotRepository;
    private final BookingServiceRepository bookingServiceRepository;
    private final FieldSlotRepository    fieldSlotRepository;
    private final FieldRepository        fieldRepository;
    private final VoucherRepository      voucherRepository;
    private final RefundRepository       refundRepository;
    private final EmailService           emailService;

    private static final int    MAX_CONSECUTIVE_SLOTS = 3;   // BR-25
    private static final int    PAYMENT_LOCK_MINUTES   = 10; // BR-27: tổng 10 phút (đặt + thanh toán), không tách 5+5
    private static final int    CANCEL_FULL_REFUND_HOURS = 6; // BR-48
    private static final Random RANDOM = new Random();

    // ── Create ───────────────────────────────────────────────────────────────

    @Transactional
    public BookingResponse createBooking(Account account, CreateBookingRequest req) {
        Field field = fieldRepository.findById(req.getFieldId())
                .orElseThrow(() -> AppException.notFound("Sân không tồn tại: " + req.getFieldId()));

        if (req.getFieldSlotIds().isEmpty())
            throw AppException.badRequest("Vui lòng chọn ít nhất 1 khung giờ");

        if (req.getFieldSlotIds().size() > MAX_CONSECUTIVE_SLOTS)
            throw AppException.badRequest("Chỉ được đặt tối đa " + MAX_CONSECUTIVE_SLOTS + " khung giờ liên tiếp");

        // Load + lock từng slot, validate AVAILABLE + cùng field + liên tiếp
        List<FieldSlot> slots = req.getFieldSlotIds().stream()
                .map(id -> fieldSlotRepository.findByIdWithLock(id)
                        .orElseThrow(() -> AppException.notFound("Khung giờ không tồn tại: " + id)))
                .sorted(Comparator.comparing(FieldSlot::getStartTime))
                .toList();

        validateSlots(slots, field.getId());

        // Tính tiền sân
        BigDecimal fieldAmount = slots.stream()
                .map(FieldSlot::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Áp voucher (nếu có)
        Voucher voucher = null;
        BigDecimal discountAmount = BigDecimal.ZERO;
        if (req.getVoucherCode() != null && !req.getVoucherCode().isBlank()) {
            voucher = validateAndResolveVoucher(req.getVoucherCode().trim().toUpperCase(), fieldAmount);
            discountAmount = calculateDiscount(voucher, fieldAmount);
        }

        BigDecimal totalAmount = fieldAmount.subtract(discountAmount); // service_amount=0 lúc tạo

        Booking booking = Booking.builder()
                .bookingCode(generateBookingCode())
                .account(account)
                .field(field)
                .voucher(voucher)
                .status(BookingStatus.PENDING_PAYMENT)
                .fieldAmount(fieldAmount)
                .serviceAmount(BigDecimal.ZERO)
                .compensationAmount(BigDecimal.ZERO)
                .discountAmount(discountAmount)
                .totalAmount(totalAmount)
                .paymentDeadline(LocalDateTime.now().plusMinutes(PAYMENT_LOCK_MINUTES))
                .note(req.getNote())
                .build();
        booking = bookingRepository.save(booking);

        // Lock slots: AVAILABLE -> PENDING, tạo BookingSlot snapshot giá
        for (FieldSlot slot : slots) {
            slot.setStatus(SlotStatus.PENDING);
            fieldSlotRepository.save(slot);

            BookingSlot bs = BookingSlot.builder()
                    .booking(booking)
                    .fieldSlot(slot)
                    .bookedPrice(slot.getPrice())
                    .build();
            bookingSlotRepository.save(bs);
        }

        // Tăng used_quantity của voucher (giữ chỗ — rollback ở cancel/expire)
        if (voucher != null) {
            voucher.setUsedQuantity(voucher.getUsedQuantity() + 1);
            voucherRepository.save(voucher);
        }

        log.info("[Booking] Tạo booking {} cho user {} - sân {} - {} slot - tổng {}",
                booking.getBookingCode(), account.getEmail(), field.getName(), slots.size(), totalAmount);

        List<BookingSlot> savedSlots = bookingSlotRepository.findByBookingId(booking.getId());
        return BookingResponse.from(booking, savedSlots);
    }

    // ── Query ────────────────────────────────────────────────────────────────

    @Transactional
    public BookingResponse findById(UUID id) {
        Booking b = getOrThrow(id);
        return BookingResponse.from(b, bookingSlotRepository.findByBookingId(id));
    }

    @Transactional
    public BookingResponse findByCode(String code) {
        Booking b = bookingRepository.findByBookingCode(code)
                .orElseThrow(() -> AppException.notFound("Booking không tồn tại: " + code));
        return BookingResponse.from(b, bookingSlotRepository.findByBookingId(b.getId()));
    }

    @Transactional
    public List<BookingResponse> findMyBookings(Account account) {
        return bookingRepository.findByAccountIdOrderByCreatedAtDesc(account.getId()).stream()
                .map(b -> BookingResponse.from(b, bookingSlotRepository.findByBookingId(b.getId())))
                .toList();
    }

    @Transactional
    public List<BookingResponse> findAll() {
        return bookingRepository.findAll().stream()
                .map(b -> BookingResponse.from(b, bookingSlotRepository.findByBookingId(b.getId())))
                .toList();
    }

    /** Staff: lấy tất cả booking có slot trong ngày chỉ định (mặc định hôm nay) */
    @Transactional(readOnly = true)
    public List<BookingResponse> findByDate(java.time.LocalDate date) {
        return bookingRepository.findBySlotDate(date).stream()
                .map(b -> BookingResponse.from(b, bookingSlotRepository.findByBookingId(b.getId())))
                .toList();
    }

    public Booking getOrThrow(UUID id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("Booking không tồn tại: " + id));
    }

    // ── Cancel (BR-47, BR-48, BR-49) ────────────────────────────────────────

    @Transactional
    public BookingResponse cancelBooking(Account account, UUID bookingId, String reason) {
        Booking booking = getOrThrow(bookingId);
        ensureOwnerOrStaff(account, booking);

        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.PENDING_PAYMENT)
            throw AppException.badRequest("Chỉ có thể hủy booking đang chờ thanh toán hoặc đã xác nhận");

        List<BookingSlot> bookingSlots = bookingSlotRepository.findByBookingId(bookingId);

        // BR-48/49: validate thời gian hủy trước khi làm bất cứ điều gì
        boolean wasPendingPayment = booking.getStatus() == BookingStatus.PENDING_PAYMENT;
        if (!wasPendingPayment && !bookingSlots.isEmpty()) {
            LocalDateTime earliest = bookingSlots.stream()
                .map(bs -> java.time.LocalDateTime.of(bs.getFieldSlot().getSlotDate(), bs.getFieldSlot().getStartTime()))
                .min(LocalDateTime::compareTo).orElse(LocalDateTime.now());
            long hoursLeft = java.time.Duration.between(LocalDateTime.now(), earliest).toHours();
            long minutesLeft = java.time.Duration.between(LocalDateTime.now(), earliest).toMinutes() % 60;
            if (hoursLeft < CANCEL_FULL_REFUND_HOURS) {
                throw AppException.badRequest(
                    "Không thể hủy đơn và được hoàn tiền vì chỉ còn " + hoursLeft + " giờ " + minutesLeft +
                    " phút trước giờ đá (chính sách yêu cầu hủy trước ít nhất " + CANCEL_FULL_REFUND_HOURS +
                    " giờ). Nếu vẫn hủy, bạn sẽ mất 100% tiền đặt cọc."
                );
            }
        }

        releaseSlots(bookingSlots);
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setNote(appendNote(booking.getNote(), "Hủy: " + (reason == null ? "không rõ lý do" : reason)));
        bookingRepository.save(booking);

        rollbackVoucherUsage(booking);

        // Chỉ tạo refund task nếu đã thanh toán (CONFIRMED). PENDING_PAYMENT chưa trả tiền -> không cần refund.
        int refundPercent = 0;
        BigDecimal refundAmount = BigDecimal.ZERO;
        if (!wasPendingPayment) {
            var refund = createRefundTask(booking, bookingSlots);
            refundPercent = refund.getRefundPercent();
            refundAmount  = refund.getRefundAmount();
        }

        // Gửi email thông báo hủy booking
        emailService.sendBookingCancelled(
            account.getEmail(), account.getFullName(),
            booking.getBookingCode(), booking.getField().getName(),
            refundAmount, refundPercent
        );

        log.info("[Booking] Hủy booking {} bởi {}", booking.getBookingCode(), account.getEmail());
        return BookingResponse.from(booking, List.of());
    }

    // ── Check-in (UC18) ──────────────────────────────────────────────────────

    /**
     * Staff xác nhận khách đã đến sân — đổi CONFIRMED → IN_PROGRESS.
     * BR-52: chỉ check-in khi booking đang CONFIRMED.
     * BR-53: không check-in sớm hơn 30 phút so với giờ bắt đầu slot sớm nhất.
     */
    @Transactional
    public BookingResponse checkin(Account staff, UUID bookingId) {
        Booking booking = getOrThrow(bookingId);

        if (booking.getStatus() != BookingStatus.CONFIRMED)
            throw AppException.badRequest("Chỉ có thể check-in booking đang ở trạng thái CONFIRMED (hiện tại: " + booking.getStatus() + ")");

        List<BookingSlot> bookingSlots = bookingSlotRepository.findByBookingId(bookingId);

        // BR-53: không check-in sớm hơn 30 phút
        bookingSlots.stream()
                .map(bs -> java.time.LocalDateTime.of(bs.getFieldSlot().getSlotDate(), bs.getFieldSlot().getStartTime()))
                .min(java.time.LocalDateTime::compareTo)
                .ifPresent(earliest -> {
                    long minutesUntil = java.time.Duration.between(LocalDateTime.now(), earliest).toMinutes();
                    if (minutesUntil > 30)
                        throw AppException.badRequest(
                            "Không thể check-in sớm hơn 30 phút trước giờ đá (còn " + minutesUntil + " phút nữa)");
                });

        booking.setStatus(BookingStatus.IN_PROGRESS);
        booking.setCheckinAt(LocalDateTime.now());
        bookingRepository.save(booking);

        log.info("[CheckIn] Staff {} check-in booking {} lúc {}", staff.getEmail(), booking.getBookingCode(), booking.getCheckinAt());
        return BookingResponse.from(booking, bookingSlots);
    }

    // ── Check-out (UC19) ─────────────────────────────────────────────────────

    /**
     * Staff xác nhận khách đã rời sân — đổi IN_PROGRESS → COMPLETED.
     * BR-56: staff bấm "Confirm Match Completion" sau khi mọi dịch vụ đã được thanh toán.
     * BR-81: tối thiểu 30 phút sau giờ check-in mới được checkout.
     */
    @Transactional
    public BookingResponse checkout(Account staff, UUID bookingId) {
        Booking booking = getOrThrow(bookingId);

        if (booking.getStatus() != BookingStatus.IN_PROGRESS)
            throw AppException.badRequest("Chỉ có thể check-out booking đang ở trạng thái IN_PROGRESS (hiện tại: " + booking.getStatus() + ")");

        // BR-81: tối thiểu 30 phút sau check-in
        if (booking.getCheckinAt() != null) {
            long minutesSinceCheckin = java.time.Duration.between(booking.getCheckinAt(), LocalDateTime.now()).toMinutes();
            if (minutesSinceCheckin < 30)
                throw AppException.badRequest(
                    "Phải chờ ít nhất 30 phút sau check-in mới có thể check-out (mới qua " + minutesSinceCheckin + " phút)");
        }

        booking.setStatus(BookingStatus.COMPLETED);
        booking.setCheckoutAt(LocalDateTime.now());
        bookingRepository.save(booking);

        List<BookingSlot> bookingSlots = bookingSlotRepository.findByBookingId(bookingId);

        // Gửi email mời survey (bất đồng bộ)
        emailService.sendSurveyInvitation(
            booking.getAccount().getEmail(),
            booking.getAccount().getFullName(),
            booking.getBookingCode(),
            booking.getField().getName()
        );

        log.info("[CheckOut] Staff {} checkout booking {} lúc {}", staff.getEmail(), booking.getBookingCode(), booking.getCheckoutAt());
        return BookingResponse.from(booking, bookingSlots);
    }

    /** Job tự động hủy booking PENDING_PAYMENT quá hạn (gọi từ scheduler). */
    @Transactional
    public void expirePendingBooking(Booking booking) {
        List<BookingSlot> bookingSlots = bookingSlotRepository.findByBookingId(booking.getId());
        releaseSlots(bookingSlots);

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setNote(appendNote(booking.getNote(), "Tự động hủy: quá hạn thanh toán"));
        bookingRepository.save(booking);

        rollbackVoucherUsage(booking);
        log.info("[Booking] Tự động hủy booking hết hạn {}", booking.getBookingCode());
    }

    // ── Internal: validation ────────────────────────────────────────────────

    private void validateSlots(List<FieldSlot> slots, UUID fieldId) {
        for (FieldSlot s : slots) {
            if (!s.getField().getId().equals(fieldId))
                throw AppException.badRequest("Tất cả khung giờ phải thuộc cùng 1 sân");
            if (s.getStatus() != SlotStatus.AVAILABLE)
                throw AppException.conflict("Khung giờ " + s.getStartTime() + " đã được đặt hoặc đang giữ chỗ");
            if (s.getSlotDate().isBefore(java.time.LocalDate.now()))
                throw AppException.badRequest("Không thể đặt khung giờ trong quá khứ");
        }

        // Kiểm tra liên tiếp: mỗi slot cách slot trước đúng 75 phút (60 chơi + 15 nghỉ)
        for (int i = 1; i < slots.size(); i++) {
            FieldSlot prev = slots.get(i - 1);
            FieldSlot curr = slots.get(i);
            if (!prev.getSlotDate().equals(curr.getSlotDate()))
                throw AppException.badRequest("Các khung giờ phải cùng 1 ngày");
            long minutesBetween = java.time.Duration.between(prev.getStartTime(), curr.getStartTime()).toMinutes();
            if (minutesBetween != 75)
                throw AppException.badRequest("Các khung giờ phải liên tiếp nhau");
        }
    }

    private Voucher validateAndResolveVoucher(String code, BigDecimal orderAmount) {
        Voucher voucher = voucherRepository.findByCode(code)
                .orElseThrow(() -> AppException.badRequest("Mã giảm giá không tồn tại"));

        LocalDateTime now = LocalDateTime.now();
        if (voucher.getStatus() != com.ffzone.ffzone_backend.enums.VoucherStatus.ACTIVE)
            throw AppException.badRequest("Mã giảm giá không còn hiệu lực");
        if (now.isBefore(voucher.getStartDate()) || now.isAfter(voucher.getEndDate()))
            throw AppException.badRequest("Mã giảm giá đã hết hạn hoặc chưa bắt đầu");
        if (voucher.getUsedQuantity() >= voucher.getQuantity())
            throw AppException.badRequest("Mã giảm giá đã hết lượt sử dụng");

        return voucher;
    }

    /** BR-78: discount không được vượt quá field_amount. */
    private BigDecimal calculateDiscount(Voucher voucher, BigDecimal fieldAmount) {
        BigDecimal discount;
        if (voucher.getVoucherType() == VoucherType.PERCENT) {
            discount = fieldAmount.multiply(voucher.getDiscountValue())
                    .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
        } else {
            discount = voucher.getDiscountValue();
        }
        return discount.min(fieldAmount); // cap tại field_amount
    }

    private void rollbackVoucherUsage(Booking booking) {
        if (booking.getVoucher() != null) {
            Voucher v = booking.getVoucher();
            v.setUsedQuantity(Math.max(0, v.getUsedQuantity() - 1));
            voucherRepository.save(v);
        }
    }

    // ── Internal: slot release ──────────────────────────────────────────────

    /**
     * Giải phóng slot về AVAILABLE và XÓA record BookingSlot cũ.
     * QUAN TRỌNG: booking_slots.field_slot_id có UNIQUE constraint (BR-26).
     * Nếu chỉ đổi FieldSlot.status mà không xóa BookingSlot, lần đặt sau cho
     * cùng slot sẽ insert trùng field_slot_id → vi phạm constraint dù slot
     * đã AVAILABLE trở lại. Booking cha (CANCELLED) vẫn giữ nguyên — đây chỉ
     * xóa bảng nối, không xóa lịch sử booking.
     */
    private void releaseSlots(List<BookingSlot> bookingSlots) {
        for (BookingSlot bs : bookingSlots) {
            FieldSlot slot = bs.getFieldSlot();
            slot.setStatus(SlotStatus.AVAILABLE);
            fieldSlotRepository.save(slot);
        }
        bookingSlotRepository.deleteAll(bookingSlots);
    }

    // ── Internal: refund (BR-48 / BR-49) ────────────────────────────────────

    private Refund createRefundTask(Booking booking, List<BookingSlot> bookingSlots) {
        if (bookingSlots.isEmpty()) return Refund.builder()
                .refundPercent(0).refundAmount(BigDecimal.ZERO).build();

        java.time.LocalDateTime earliestSlotStart = bookingSlots.stream()
                .map(bs -> java.time.LocalDateTime.of(bs.getFieldSlot().getSlotDate(), bs.getFieldSlot().getStartTime()))
                .min(java.time.LocalDateTime::compareTo)
                .orElse(LocalDateTime.now());

        long hoursUntilMatch = java.time.Duration.between(LocalDateTime.now(), earliestSlotStart).toHours();

        int refundPercent = hoursUntilMatch >= CANCEL_FULL_REFUND_HOURS ? 100 : 0; // BR-48/BR-49
        BigDecimal refundAmount = booking.getTotalAmount()
                .multiply(BigDecimal.valueOf(refundPercent))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);

        Refund refund = Refund.builder()
                .booking(booking)
                .cancelType(com.ffzone.ffzone_backend.enums.CancelReasonType.USER_CANCEL)
                .refundPercent(refundPercent)
                .refundAmount(refundAmount)
                .status(com.ffzone.ffzone_backend.enums.RefundStatus.PENDING)
                .build();
        refundRepository.save(refund);

        log.info("[Booking] Tạo refund task cho {} - {}% - {}đ",
                booking.getBookingCode(), refundPercent, refundAmount);
        return refund;
    }

    // ── Internal: helpers ────────────────────────────────────────────────────

    private void ensureOwnerOrStaff(Account account, Booking booking) {
        String role = account.getRole().name();
        boolean isStaffLike = role.equals("STAFF") || role.equals("OWNER") || role.equals("IT_ADMIN");
        if (!isStaffLike && !booking.getAccount().getId().equals(account.getId()))
            throw AppException.forbidden("Không có quyền thao tác booking này");
    }

    private String appendNote(String existing, String add) {
        if (existing == null || existing.isBlank()) return add;
        return existing + " | " + add;
    }

    /** Format: FFZ-yyyyMMdd-XXXX (XXXX = random 4 chữ số) */
    private String generateBookingCode() {
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String code;
        do {
            int rand = 1000 + RANDOM.nextInt(9000);
            code = "FFZ-" + datePart + "-" + rand;
        } while (bookingRepository.findByBookingCode(code).isPresent());
        return code;
    }
}