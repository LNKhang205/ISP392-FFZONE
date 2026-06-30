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

    private final BookingRepository        bookingRepository;
    private final BookingSlotRepository    bookingSlotRepository;
    private final BookingServiceRepository bookingServiceRepository;
    private final FieldSlotRepository      fieldSlotRepository;
    private final FieldRepository          fieldRepository;
    private final VoucherRepository        voucherRepository;
    private final UserVoucherRepository    userVoucherRepository;
    private final ServiceRepository        serviceRepository;
    private final RefundRepository         refundRepository;

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
            // Kiểm tra user sở hữu voucher này và chưa dùng
            UserVoucher userVoucher = userVoucherRepository
                    .findByAccountIdAndVoucherId(account.getId(), voucher.getId())
                    .orElseThrow(() -> AppException.badRequest("Bạn không sở hữu mã giảm giá này"));
            if (userVoucher.getIsUsed())
                throw AppException.badRequest("Mã giảm giá này đã được sử dụng");
            // Bug fix: tính discount trên tổng đơn (sân + dịch vụ nếu có), không chỉ fieldAmount
            discountAmount = calculateDiscount(voucher, fieldAmount);
            // Mark UserVoucher là đã dùng
            userVoucher.setIsUsed(true);
            userVoucher.setUsedAt(LocalDateTime.now());
            userVoucherRepository.save(userVoucher);
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

    // ── Add services at venue (CHECKED_IN) ──────────────────────────────────
 
    /**
     * Đặt thêm dịch vụ khi đang sử dụng sân (status = IN_PROGRESS / CONFIRMED).
     * - Booking chỉ được dùng tối đa 1 voucher suốt vòng đời.
     * - Nếu booking chưa có voucher, user có thể áp 1 voucher tại đây.
     * - Trả về URL thanh toán VNPay cho phần dịch vụ mới thêm.
     * - ServiceAmount và totalAmount được cập nhật sau khi thêm.
     */
    @Transactional
    public AddVenueServiceResult addServicesAtVenue(
            Account account,
            UUID bookingId,
            List<AddVenueServiceItem> items,
            String voucherCode) {
 
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> AppException.notFound("Booking không tồn tại: " + bookingId));
 
        // Chỉ user của booking mới được thao tác
        if (!booking.getAccount().getId().equals(account.getId()))
            throw AppException.forbidden("Không có quyền thao tác booking này");
 
        // Chỉ cho phép khi booking đang CONFIRMED hoặc IN_PROGRESS (đã check-in)
        if (booking.getStatus() != BookingStatus.CONFIRMED
                && booking.getStatus() != BookingStatus.IN_PROGRESS)
            throw AppException.badRequest("Chỉ có thể thêm dịch vụ khi booking đã xác nhận hoặc đang diễn ra");
 
        // Validate items
        if (items == null || items.isEmpty())
            throw AppException.badRequest("Vui lòng chọn ít nhất 1 dịch vụ");
 
        // Tính tổng tiền dịch vụ mới
        BigDecimal newServiceTotal = BigDecimal.ZERO;
        List<ServiceLineItem> lines = new java.util.ArrayList<>();
        for (AddVenueServiceItem item : items) {
            com.ffzone.ffzone_backend.entity.Service svc = serviceRepository
                    .findById(item.serviceId())
                    .orElseThrow(() -> AppException.notFound("Dịch vụ không tồn tại: " + item.serviceId()));
            if (!svc.getIsActive())
                throw AppException.badRequest("Dịch vụ không khả dụng: " + svc.getName());
            int qty = Math.max(1, item.quantity());
            BigDecimal lineTotal = svc.getPrice().multiply(BigDecimal.valueOf(qty));
            newServiceTotal = newServiceTotal.add(lineTotal);
            lines.add(new ServiceLineItem(svc, qty, lineTotal));
        }
 
        // Xử lý voucher: booking chỉ được 1 voucher duy nhất suốt vòng đời
        BigDecimal newDiscountAmount = BigDecimal.ZERO;
        Voucher voucher = null;
        if (voucherCode != null && !voucherCode.isBlank()) {
            if (booking.getVoucher() != null)
                throw AppException.badRequest("Booking này đã sử dụng voucher. Mỗi booking chỉ được áp 1 voucher.");
            voucher = validateAndResolveVoucher(voucherCode.trim().toUpperCase(), newServiceTotal);
            UserVoucher userVoucher = userVoucherRepository
                    .findByAccountIdAndVoucherId(account.getId(), voucher.getId())
                    .orElseThrow(() -> AppException.badRequest("Bạn không sở hữu mã giảm giá này"));
            if (userVoucher.getIsUsed())
                throw AppException.badRequest("Mã giảm giá này đã được sử dụng");
            newDiscountAmount = calculateDiscount(voucher, newServiceTotal);
            userVoucher.setIsUsed(true);
            userVoucher.setUsedAt(LocalDateTime.now());
            userVoucherRepository.save(userVoucher);
            // Gắn voucher vào booking + tăng usedQuantity
            booking.setVoucher(voucher);
            booking.setDiscountAmount(booking.getDiscountAmount().add(newDiscountAmount));
            voucher.setUsedQuantity(voucher.getUsedQuantity() + 1);
            voucherRepository.save(voucher);
        }
 
        // Lưu BookingService items
        for (ServiceLineItem line : lines) {
            bookingServiceRepository
                .findByBookingIdAndServiceId(bookingId, line.svc().getId())
                .ifPresentOrElse(existing -> {
                    int newQty = existing.getQuantity() + line.qty();
                    existing.setQuantity(newQty);
                    existing.setTotalPrice(existing.getUnitPrice().multiply(BigDecimal.valueOf(newQty)));
                    bookingServiceRepository.save(existing);
                }, () -> {
                    BookingService bs = BookingService.builder()
                            .booking(booking)
                            .service(line.svc())
                            .quantity(line.qty())
                            .unitPrice(line.svc().getPrice())
                            .totalPrice(line.total())
                            .addedBy(account)
                            .build();
                    bookingServiceRepository.save(bs);
                });
        }
 
        // Cập nhật serviceAmount và totalAmount
        BigDecimal totalServiceAmount = bookingServiceRepository.findByBookingId(bookingId)
                .stream().map(BookingService::getTotalPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        booking.setServiceAmount(totalServiceAmount);
        booking.setTotalAmount(
                booking.getFieldAmount()
                        .add(totalServiceAmount)
                        .add(booking.getCompensationAmount())
                        .subtract(booking.getDiscountAmount())
        );
        bookingRepository.save(booking);
 
        // Số tiền cần thanh toán thêm = dịch vụ mới - giảm giá mới
        BigDecimal payAmount = newServiceTotal.subtract(newDiscountAmount);
        if (payAmount.compareTo(BigDecimal.ZERO) < 0) payAmount = BigDecimal.ZERO;
 
        log.info("[Booking] Thêm dịch vụ tại sân cho {} - {} dịch vụ - tổng thêm {}đ",
                booking.getBookingCode(), lines.size(), payAmount);
 
        return new AddVenueServiceResult(booking.getId(), booking.getBookingCode(), payAmount);
    }
 
    /** DTO nội bộ cho kết quả addServicesAtVenue */
    public record AddVenueServiceResult(UUID bookingId, String bookingCode, BigDecimal payAmount) {}
    /** DTO nội bộ cho từng dịch vụ trong request */
    public record AddVenueServiceItem(UUID serviceId, int quantity) {}
    private record ServiceLineItem(com.ffzone.ffzone_backend.entity.Service svc, int qty, BigDecimal total) {}
 
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
        releaseSlots(bookingSlots);

        boolean wasPendingPayment = booking.getStatus() == BookingStatus.PENDING_PAYMENT;
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setNote(appendNote(booking.getNote(), "Hủy: " + (reason == null ? "không rõ lý do" : reason)));
        bookingRepository.save(booking);

        rollbackVoucherUsage(booking);

        // Chỉ tạo refund task nếu đã thanh toán (CONFIRMED). PENDING_PAYMENT chưa trả tiền -> không cần refund.
        if (!wasPendingPayment) {
            createRefundTask(booking, bookingSlots);
        }

        log.info("[Booking] Hủy booking {} bởi {}", booking.getBookingCode(), account.getEmail());
        return BookingResponse.from(booking, List.of());
    }

    /** Job tự động hủy booking PENDING_PAYMENT quá hạn (gọi từ scheduler). */
    @Transactional
    public void expirePendingBooking(Booking detachedBooking) {
        Booking booking = bookingRepository.findById(detachedBooking.getId())
                .orElseThrow(() -> AppException.notFound("Booking không tồn tại: " + detachedBooking.getId()));

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

    /** BR-78: discount không được vượt quá tổng đơn hàng (field + service). */
    private BigDecimal calculateDiscount(Voucher voucher, BigDecimal orderAmount) {
        BigDecimal discount;
        if (voucher.getVoucherType() == VoucherType.PERCENT) {
            discount = orderAmount.multiply(voucher.getDiscountValue())
                    .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
        } else {
            discount = voucher.getDiscountValue();
        }
        return discount.min(orderAmount); // cap tại tổng đơn
    }

    private void rollbackVoucherUsage(Booking booking) {
        if (booking.getVoucher() != null) {
            Voucher v = booking.getVoucher();
            v.setUsedQuantity(Math.max(0, v.getUsedQuantity() - 1));
            voucherRepository.save(v);
        }
    }

    // ── Internal: slot release ──────────────────────────────────────────────

    private void releaseSlots(List<BookingSlot> bookingSlots) {
        for (BookingSlot bs : bookingSlots) {
            FieldSlot slot = bs.getFieldSlot();
            slot.setStatus(SlotStatus.AVAILABLE);
            fieldSlotRepository.save(slot);
        }
    }

    // ── Internal: refund (BR-48 / BR-49) ────────────────────────────────────

    private void createRefundTask(Booking booking, List<BookingSlot> bookingSlots) {
        if (bookingSlots.isEmpty()) return;

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