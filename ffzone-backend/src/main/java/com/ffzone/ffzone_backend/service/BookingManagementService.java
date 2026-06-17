package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.request.BookingRequest;
import com.ffzone.ffzone_backend.dto.response.BookingResponse;
import com.ffzone.ffzone_backend.entity.*;
import com.ffzone.ffzone_backend.enums.*;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BookingManagementService {

    private final BookingRepository        bookingRepository;
    private final BookingSlotRepository    bookingSlotRepository;
    private final BookingServiceRepository bookingServiceRepository;
    private final FieldSlotRepository      fieldSlotRepository;
    private final FieldPricingRepository   pricingRepository;
    private final VoucherRepository        voucherRepository;
    private final ServiceRepository        serviceRepository;
    private final AccountRepository        accountRepository;
    private final PaymentRepository        paymentRepository;

    // ── 1. Tạo booking ───────────────────────────────────────────────────────

    @Transactional
    public BookingResponse createBooking(UUID accountId, BookingRequest req) {

        // Validate input
        if (req.getSlotIds() == null || req.getSlotIds().isEmpty())
            throw AppException.badRequest("Phải chọn ít nhất 1 slot");
        if (req.getSlotIds().size() > 3)
            throw AppException.badRequest("Tối đa 3 slot liên tiếp mỗi booking");

        Account account = accountRepository.findById(accountId)
            .orElseThrow(() -> AppException.notFound("Tài khoản không tồn tại"));

        // Load và lock từng slot (Optimistic Lock — @Version)
        List<FieldSlot> slots = new ArrayList<>();
        for (UUID slotId : req.getSlotIds()) {
            FieldSlot slot = fieldSlotRepository.findByIdWithLock(slotId)
                .orElseThrow(() -> AppException.notFound("Slot không tồn tại: " + slotId));
            if (slot.getStatus() != SlotStatus.AVAILABLE)
                throw AppException.conflict("Slot đã được đặt hoặc đang bị giữ: " + slotId);
            slots.add(slot);
        }

        // Kiểm tra tất cả slot cùng sân
        Field field = slots.get(0).getField();
        for (FieldSlot s : slots) {
            if (!s.getField().getId().equals(field.getId()))
                throw AppException.badRequest("Tất cả slot phải thuộc cùng một sân");
        }

        // Tính tiền sân + lock slot → PENDING
        BigDecimal fieldAmount = BigDecimal.ZERO;
        Map<UUID, BigDecimal> slotPriceMap = new LinkedHashMap<>();
        for (FieldSlot s : slots) {
            BigDecimal price = resolveSlotPrice(s);
            slotPriceMap.put(s.getId(), price);
            fieldAmount = fieldAmount.add(price);
            s.setStatus(SlotStatus.PENDING);
            fieldSlotRepository.save(s);
        }

        // Tính tiền dịch vụ
        BigDecimal serviceAmount = BigDecimal.ZERO;
        List<com.ffzone.ffzone_backend.entity.BookingService> pendingServices = new ArrayList<>();
        List<BookingRequest.ServiceItem> svcItems =
            req.getServices() != null ? req.getServices() : Collections.emptyList();

        for (BookingRequest.ServiceItem item : svcItems) {
            com.ffzone.ffzone_backend.entity.Service svc = serviceRepository.findById(item.getServiceId())
                .orElseThrow(() -> AppException.notFound("Dịch vụ không tồn tại: " + item.getServiceId()));
            if (!svc.getIsActive())
                throw AppException.badRequest("Dịch vụ không khả dụng: " + svc.getName());
            int qty = item.getQuantity() != null && item.getQuantity() > 0 ? item.getQuantity() : 1;
            BigDecimal total = svc.getPrice().multiply(BigDecimal.valueOf(qty));
            serviceAmount = serviceAmount.add(total);
            pendingServices.add(com.ffzone.ffzone_backend.entity.BookingService.builder()
                .service(svc).quantity(qty)
                .unitPrice(svc.getPrice()).totalPrice(total)
                .addedBy(account)
                .build());
        }

        // Áp voucher (nếu có)
        BigDecimal discountAmount = BigDecimal.ZERO;
        Voucher appliedVoucher = null;
        if (req.getVoucherCode() != null && !req.getVoucherCode().isBlank()) {
            appliedVoucher = validateAndUseVoucher(req.getVoucherCode(), fieldAmount);
            discountAmount = calcDiscount(appliedVoucher, fieldAmount);
        }

        // Tổng tiền
        BigDecimal totalAmount = fieldAmount.add(serviceAmount).subtract(discountAmount);

        // Lưu Booking
        String bookingCode = generateBookingCode();
        Booking booking = Booking.builder()
            .bookingCode(bookingCode)
            .account(account)
            .field(field)
            .voucher(appliedVoucher)
            .status(BookingStatus.PENDING_PAYMENT)
            .fieldAmount(fieldAmount)
            .serviceAmount(serviceAmount)
            .discountAmount(discountAmount)
            .totalAmount(totalAmount)
            .paymentDeadline(LocalDateTime.now().plusMinutes(5))
            .note(req.getNote())
            .build();
        booking = bookingRepository.save(booking);

        // Lưu BookingSlot
        for (FieldSlot s : slots) {
            bookingSlotRepository.save(BookingSlot.builder()
                .booking(booking)
                .fieldSlot(s)
                .bookedPrice(slotPriceMap.get(s.getId()))
                .build());
        }

        // Lưu BookingService
        for (com.ffzone.ffzone_backend.entity.BookingService bs : pendingServices) {
            bs.setBooking(booking);
            bookingServiceRepository.save(bs);
        }

        log.info("Booking created: {} by account: {}", bookingCode, accountId);
        return buildFullResponse(booking);
    }

    // ── 2. Lấy lịch sử booking của user ─────────────────────────────────────

    public List<BookingResponse> getMyBookings(UUID accountId) {
        return bookingRepository.findByAccountIdOrderByCreatedAtDesc(accountId)
            .stream().map(this::buildFullResponse).toList();
    }

    // ── 3. Chi tiết 1 booking ─────────────────────────────────────────────────

    public BookingResponse getBookingDetail(UUID bookingId) {
        return buildFullResponse(getOrThrow(bookingId));
    }

    // ── 4. Lấy tất cả booking (Staff / IT_ADMIN / OWNER) ─────────────────────

    public List<BookingResponse> getAllBookings() {
        return bookingRepository.findAll().stream().map(this::buildFullResponse).toList();
    }

    // ── 5. Lấy theo status ────────────────────────────────────────────────────

    public List<BookingResponse> getByStatus(BookingStatus status) {
        return bookingRepository.findByStatus(status)
            .stream().map(this::buildFullResponse).toList();
    }

    // ── 6. Huỷ booking (USER tự huỷ) ────────────────────────────────────────

    @Transactional
    public BookingResponse cancelBooking(UUID bookingId, UUID accountId) {
        Booking booking = getOrThrow(bookingId);

        if (!booking.getAccount().getId().equals(accountId))
            throw AppException.forbidden("Không có quyền huỷ booking này");

        if (booking.getStatus() != BookingStatus.CONFIRMED
                && booking.getStatus() != BookingStatus.PENDING_PAYMENT)
            throw AppException.badRequest("Chỉ có thể huỷ booking ở trạng thái CONFIRMED hoặc PENDING_PAYMENT");

        BookingStatus prevStatus = booking.getStatus();
        releaseSlots(bookingId);
        booking.setStatus(BookingStatus.CANCELLED);

        // Nếu đã CONFIRMED + đã thanh toán → chuyển sang REFUND_PENDING
        if (prevStatus == BookingStatus.CONFIRMED) {
            paymentRepository.findByBookingId(bookingId).ifPresent(p -> {
                if (p.getStatus() == PaymentStatus.PAID)
                    booking.setStatus(BookingStatus.REFUND_PENDING);
            });
        }

        return buildFullResponse(bookingRepository.save(booking));
    }

    // ── 7. Check-in (STAFF) ───────────────────────────────────────────────────

    @Transactional
    public BookingResponse checkin(UUID bookingId) {
        Booking booking = getOrThrow(bookingId);
        if (booking.getStatus() != BookingStatus.CONFIRMED)
            throw AppException.badRequest("Booking phải ở trạng thái CONFIRMED để check-in");

        booking.setStatus(BookingStatus.IN_PROGRESS);
        booking.setCheckinAt(LocalDateTime.now());

        bookingSlotRepository.findByBookingId(bookingId).forEach(bs -> {
            bs.getFieldSlot().setStatus(SlotStatus.OCCUPIED);
            fieldSlotRepository.save(bs.getFieldSlot());
        });

        log.info("Check-in booking: {}", booking.getBookingCode());
        return buildFullResponse(bookingRepository.save(booking));
    }

    // ── 8. Check-out / Hoàn thành (STAFF) ────────────────────────────────────

    @Transactional
    public BookingResponse checkout(UUID bookingId) {
        Booking booking = getOrThrow(bookingId);
        if (booking.getStatus() != BookingStatus.IN_PROGRESS)
            throw AppException.badRequest("Booking phải ở trạng thái IN_PROGRESS để check-out");

        booking.setStatus(BookingStatus.COMPLETED);
        booking.setCheckoutAt(LocalDateTime.now());

        log.info("Check-out booking: {}", booking.getBookingCode());
        return buildFullResponse(bookingRepository.save(booking));
    }

    // ── 9. Auto-expire (gọi từ Scheduler) ────────────────────────────────────

    @Transactional
    public void expireOverdueBookings() {
        List<Booking> expired = bookingRepository.findExpiredPendingBookings(LocalDateTime.now());
        for (Booking b : expired) {
            releaseSlots(b.getId());
            b.setStatus(BookingStatus.CANCELLED);
            bookingRepository.save(b);
            log.info("Auto-expired booking: {}", b.getBookingCode());
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private BigDecimal resolveSlotPrice(FieldSlot slot) {
        DayOfWeek dow = slot.getSlotDate().getDayOfWeek();
        String dayType = (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY)
            ? "WEEKEND" : "WEEKDAY";

        return pricingRepository.findActivePrice(
                slot.getField().getId(), dayType,
                slot.getStartTime(), slot.getSlotDate())
            .map(FieldPricing::getPrice)
            .orElseThrow(() -> AppException.badRequest(
                "Không tìm thấy bảng giá cho slot ngày "
                + slot.getSlotDate() + " " + slot.getStartTime()));
    }

    private Voucher validateAndUseVoucher(String code, BigDecimal fieldAmount) {
        Voucher v = voucherRepository.findByCode(code.toUpperCase())
            .orElseThrow(() -> AppException.badRequest("Voucher không tồn tại: " + code));
        if (v.getStatus() != VoucherStatus.ACTIVE)
            throw AppException.badRequest("Voucher không còn hiệu lực");
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(v.getStartDate()) || now.isAfter(v.getEndDate()))
            throw AppException.badRequest("Voucher đã hết hạn hoặc chưa có hiệu lực");
        if (v.getUsedQuantity() >= v.getQuantity())
            throw AppException.badRequest("Voucher đã hết lượt sử dụng");

        v.setUsedQuantity(v.getUsedQuantity() + 1);
        return voucherRepository.save(v);
    }

    private BigDecimal calcDiscount(Voucher v, BigDecimal fieldAmount) {
        if (v.getVoucherType() == VoucherType.PERCENT) {
            BigDecimal d = fieldAmount
                .multiply(v.getDiscountValue())
                .divide(BigDecimal.valueOf(100));
            return d.min(fieldAmount);
        }
        return v.getDiscountValue().min(fieldAmount);
    }

    private void releaseSlots(UUID bookingId) {
        bookingSlotRepository.findByBookingId(bookingId).forEach(bs -> {
            bs.getFieldSlot().setStatus(SlotStatus.AVAILABLE);
            fieldSlotRepository.save(bs.getFieldSlot());
        });
    }

    private BookingResponse buildFullResponse(Booking booking) {
        BookingResponse resp = BookingResponse.from(booking);

        List<BookingResponse.SlotInfo> slotInfos = bookingSlotRepository
            .findByBookingId(booking.getId()).stream()
            .map(bs -> BookingResponse.SlotInfo.builder()
                .slotId(bs.getFieldSlot().getId())
                .slotDate(bs.getFieldSlot().getSlotDate().toString())
                .startTime(bs.getFieldSlot().getStartTime().toString())
                .endTime(bs.getFieldSlot().getEndTime().toString())
                .bookedPrice(bs.getBookedPrice())
                .build())
            .toList();
        resp.setSlots(slotInfos);

        List<BookingResponse.ServiceInfo> svcInfos = bookingServiceRepository
            .findByBookingIdAndCancelledAtIsNull(booking.getId()).stream()
            .map(bs -> BookingResponse.ServiceInfo.builder()
                .bookingServiceId(bs.getId())
                .serviceId(bs.getService().getId())
                .serviceName(bs.getService().getName())
                .quantity(bs.getQuantity())
                .unitPrice(bs.getUnitPrice())
                .totalPrice(bs.getTotalPrice())
                .build())
            .toList();
        resp.setServices(svcInfos);

        return resp;
    }

    private String generateBookingCode() {
        String ts = LocalDateTime.now()
            .format(DateTimeFormatter.ofPattern("yyMMddHHmmss"));
        String rand = String.format("%04d", (int)(Math.random() * 9000) + 1000);
        return "FFZ-" + ts + "-" + rand;
    }

    public Booking getOrThrow(UUID id) {
        return bookingRepository.findById(id)
            .orElseThrow(() -> AppException.notFound("Booking không tồn tại: " + id));
    }
}
