package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.request.AddToCartRequest;
import com.ffzone.ffzone_backend.dto.response.BookingServiceResponse;
import com.ffzone.ffzone_backend.entity.*;
import com.ffzone.ffzone_backend.enums.BookingStatus;
import com.ffzone.ffzone_backend.enums.VoucherType;
import com.ffzone.ffzone_backend.exception.AppException;
import com.ffzone.ffzone_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BookingItemService {

    private final BookingRepository            bookingRepository;
    private final BookingServiceRepository     bookingServiceRepository;
    private final ServiceRepository            serviceRepository;
    private final CartService                  cartService;
    private final CartRepository               cartRepository;

    /** Lấy danh sách dịch vụ của một Booking */
    @Transactional(readOnly = true)
    public List<BookingServiceResponse> getItems(UUID bookingId) {
        return bookingServiceRepository.findByBookingId(bookingId)
            .stream().map(BookingServiceResponse::from).toList();
    }

    /**
     * Checkout: chuyển tất cả CartItem của user vào BookingService của booking đã có.
     * Sau đó làm trống Cart.
     * Booking phải thuộc về user đang thực hiện.
     */
    @Transactional
    public List<BookingServiceResponse> checkoutCart(Account account, UUID bookingId) {
        Booking booking = getBookingForUser(account, bookingId);

        cartRepository.findByAccountIdWithItems(account.getId()).ifPresent(cart -> {
            for (CartItem ci : cart.getItems()) {
                com.ffzone.ffzone_backend.entity.Service svc = ci.getService();
                BigDecimal unitPrice = svc.getPrice();
                BigDecimal total = unitPrice.multiply(BigDecimal.valueOf(ci.getQuantity()));

                // Nếu đã có cùng dịch vụ trong booking → cộng thêm số lượng
                bookingServiceRepository
                    .findByBookingIdAndServiceId(bookingId, svc.getId())
                    .ifPresentOrElse(existing -> {
                        int newQty = existing.getQuantity() + ci.getQuantity();
                        existing.setQuantity(newQty);
                        existing.setTotalPrice(existing.getUnitPrice()
                            .multiply(BigDecimal.valueOf(newQty)));
                        bookingServiceRepository.save(existing);
                    }, () -> {
                        BookingService bs = BookingService.builder()
                            .booking(booking)
                            .service(svc)
                            .quantity(ci.getQuantity())
                            .unitPrice(unitPrice)
                            .totalPrice(total)
                            .addedBy(account)
                            .build();
                        bookingServiceRepository.save(bs);
                    });
            }
        });

        recalcServiceAmount(booking);
        cartService.clearCart(account);

        return bookingServiceRepository.findByBookingId(bookingId)
            .stream().map(BookingServiceResponse::from).toList();
    }

    /**
     * Thêm dịch vụ trực tiếp vào Booking (không qua Cart) — dùng khi khách đã thanh toán sân
     * và muốn thêm dịch vụ từ Booking Detail.
     */
    @Transactional
    public List<BookingServiceResponse> addServiceToBooking(
            Account account, UUID bookingId, AddToCartRequest req) {

        Booking booking = getBookingForUser(account, bookingId);

        com.ffzone.ffzone_backend.entity.Service svc = serviceRepository.findById(req.getServiceId())
            .orElseThrow(() -> AppException.notFound("Dịch vụ không tồn tại: " + req.getServiceId()));

        if (!svc.getIsActive())
            throw AppException.badRequest("Dịch vụ hiện không khả dụng: " + svc.getName());

        int qty = req.getQuantity() != null ? req.getQuantity() : 1;

        bookingServiceRepository
            .findByBookingIdAndServiceId(bookingId, svc.getId())
            .ifPresentOrElse(existing -> {
                int newQty = existing.getQuantity() + qty;
                existing.setQuantity(newQty);
                existing.setTotalPrice(existing.getUnitPrice().multiply(BigDecimal.valueOf(newQty)));
                bookingServiceRepository.save(existing);
            }, () -> {
                BigDecimal unitPrice = svc.getPrice();
                BookingService bs = BookingService.builder()
                    .booking(booking)
                    .service(svc)
                    .quantity(qty)
                    .unitPrice(unitPrice)
                    .totalPrice(unitPrice.multiply(BigDecimal.valueOf(qty)))
                    .addedBy(account)
                    .build();
                bookingServiceRepository.save(bs);
            });

        recalcServiceAmount(booking);

        return bookingServiceRepository.findByBookingId(bookingId)
            .stream().map(BookingServiceResponse::from).toList();
    }

    /** Xóa 1 BookingService item khỏi Booking (chỉ khi booking chưa COMPLETED/REFUNDED) */
    @Transactional
    public void removeServiceFromBooking(Account account, UUID bookingId, UUID bookingServiceId) {
        Booking booking = getBookingForUser(account, bookingId);

        if (booking.getStatus() == BookingStatus.COMPLETED
                || booking.getStatus() == BookingStatus.REFUNDED) {
            throw AppException.badRequest("Không thể sửa dịch vụ của booking đã hoàn thành/hoàn tiền");
        }

        BookingService item = bookingServiceRepository.findById(bookingServiceId)
            .orElseThrow(() -> AppException.notFound("Mục dịch vụ không tồn tại"));

        if (!item.getBooking().getId().equals(bookingId))
            throw AppException.forbidden("Mục dịch vụ không thuộc booking này");

        bookingServiceRepository.delete(item);
        recalcServiceAmount(booking);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private Booking getBookingForUser(Account account, UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> AppException.notFound("Booking không tồn tại: " + bookingId));

        // USER chỉ được thao tác booking của chính mình; STAFF/OWNER/IT_ADMIN thao tác được tất cả
        String role = account.getRole().name();
        if (role.equals("USER") && !booking.getAccount().getId().equals(account.getId()))
            throw AppException.forbidden("Không có quyền thao tác booking này");

        return booking;
    }

    private void recalcServiceAmount(Booking booking) {
        BigDecimal serviceTotal = bookingServiceRepository
            .findByBookingId(booking.getId()).stream()
            .map(BookingService::getTotalPrice)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        booking.setServiceAmount(serviceTotal);

        // Tính lại discount theo tổng đơn mới (field + service) nếu booking có voucher
        // Fix bug: discount trước đây chỉ tính trên fieldAmount lúc tạo booking,
        // sau khi thêm dịch vụ phải tính lại trên tổng mới.
        if (booking.getVoucher() != null) {
            Voucher v = booking.getVoucher();
            BigDecimal orderTotal = booking.getFieldAmount().add(serviceTotal);
            BigDecimal newDiscount;
            if (v.getVoucherType() == VoucherType.PERCENT) {
                newDiscount = orderTotal.multiply(v.getDiscountValue())
                        .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
            } else {
                newDiscount = v.getDiscountValue();
            }
            newDiscount = newDiscount.min(orderTotal); // cap tại tổng đơn
            booking.setDiscountAmount(newDiscount);
        }

        booking.setTotalAmount(
            booking.getFieldAmount()
                .add(serviceTotal)
                .add(booking.getCompensationAmount())
                .subtract(booking.getDiscountAmount())
        );
        bookingRepository.save(booking);
    }
}