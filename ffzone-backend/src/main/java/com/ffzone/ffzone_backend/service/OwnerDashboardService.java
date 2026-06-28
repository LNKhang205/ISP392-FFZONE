package com.ffzone.ffzone_backend.service;

import com.ffzone.ffzone_backend.dto.response.OwnerDashboardResponse;
import com.ffzone.ffzone_backend.dto.response.OwnerDashboardResponse.*;
import com.ffzone.ffzone_backend.entity.Booking;
import com.ffzone.ffzone_backend.entity.BookingSlot;
import com.ffzone.ffzone_backend.entity.Field;
import com.ffzone.ffzone_backend.enums.BookingStatus;
import com.ffzone.ffzone_backend.repository.BookingRepository;
import com.ffzone.ffzone_backend.repository.BookingSlotRepository;
import com.ffzone.ffzone_backend.repository.FieldRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OwnerDashboardService {

    private final BookingRepository     bookingRepository;
    private final BookingSlotRepository bookingSlotRepository;
    private final FieldRepository       fieldRepository;

    private static final Set<BookingStatus> REVENUE_STATUSES = Set.of(
            BookingStatus.CONFIRMED,
            BookingStatus.IN_PROGRESS,
            BookingStatus.COMPLETED
    );

    @Transactional(readOnly = true)
    public OwnerDashboardResponse getDashboard(String period) {
        LocalDateTime from = resolveFrom(period);
        LocalDateTime to   = LocalDateTime.now();

        // Load tất cả bookings trong 1 transaction — EAGER load field và account
        List<Booking> allBookings    = bookingRepository.findAll();
        List<Booking> periodBookings = allBookings.stream()
                .filter(b -> b.getCreatedAt() != null
                          && !b.getCreatedAt().isBefore(from)
                          && !b.getCreatedAt().isAfter(to))
                .toList();

        // ── Tổng quan ──────────────────────────────────────────────────────
        long totalBookings     = periodBookings.size();
        long confirmedBookings = periodBookings.stream()
                .filter(b -> REVENUE_STATUSES.contains(b.getStatus())).count();
        long cancelledBookings = periodBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CANCELLED
                          || b.getStatus() == BookingStatus.REFUNDED
                          || b.getStatus() == BookingStatus.REFUND_PENDING).count();

        BigDecimal totalRevenue = periodBookings.stream()
                .filter(b -> REVENUE_STATUSES.contains(b.getStatus()))
                .map(Booking::getTotalAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        double successRate = totalBookings == 0 ? 0.0
                : Math.round(confirmedBookings * 100.0 / totalBookings * 10) / 10.0;

        BigDecimal avgRevenue = (confirmedBookings == 0) ? BigDecimal.ZERO
                : totalRevenue.divide(BigDecimal.valueOf(confirmedBookings), 0, RoundingMode.HALF_UP);

        // ── Doanh thu theo ngày ────────────────────────────────────────────
        List<DailyRevenue> revenueByDay = buildDailyRevenue(periodBookings, from, period);

        // ── Thống kê từng sân — dùng countBy thay vì findAll FieldSlot ────
        List<FieldStat> fieldStats = buildFieldStats(periodBookings);

        // ── Booking gần đây ────────────────────────────────────────────────
        List<RecentBooking> recentBookings = buildRecentBookings(periodBookings);

        return OwnerDashboardResponse.builder()
                .totalRevenue(totalRevenue)
                .totalBookings(totalBookings)
                .confirmedBookings(confirmedBookings)
                .cancelledBookings(cancelledBookings)
                .successRate(successRate)
                .avgRevenuePerBooking(avgRevenue)
                .revenueByDay(revenueByDay)
                .fieldStats(fieldStats)
                .recentBookings(recentBookings)
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private LocalDateTime resolveFrom(String period) {
        LocalDateTime now = LocalDateTime.now();
        return switch (period == null ? "month" : period) {
            case "today" -> now.toLocalDate().atStartOfDay();
            case "week"  -> now.minusDays(6).toLocalDate().atStartOfDay();
            default      -> now.minusDays(29).toLocalDate().atStartOfDay();
        };
    }

    private List<DailyRevenue> buildDailyRevenue(List<Booking> periodBookings,
                                                  LocalDateTime from, String period) {
        int days = "today".equals(period) ? 1 : "week".equals(period) ? 7 : 30;
        DateTimeFormatter labelFmt = DateTimeFormatter.ofPattern("dd/MM");
        LocalDate startDate = from.toLocalDate();

        Map<LocalDate, BigDecimal> revenueMap = new LinkedHashMap<>();
        Map<LocalDate, Long>       countMap   = new LinkedHashMap<>();
        for (int i = 0; i < days; i++) {
            LocalDate d = startDate.plusDays(i);
            revenueMap.put(d, BigDecimal.ZERO);
            countMap.put(d, 0L);
        }

        for (Booking b : periodBookings) {
            if (!REVENUE_STATUSES.contains(b.getStatus())) continue;
            LocalDate d = b.getCreatedAt().toLocalDate();
            revenueMap.merge(d, b.getTotalAmount() == null ? BigDecimal.ZERO : b.getTotalAmount(), BigDecimal::add);
            countMap.merge(d, 1L, Long::sum);
        }

        return revenueMap.entrySet().stream()
                .map(e -> DailyRevenue.builder()
                        .date(e.getKey().format(labelFmt))
                        .revenue(e.getValue())
                        .bookingCount(countMap.getOrDefault(e.getKey(), 0L))
                        .build())
                .toList();
    }

    private List<FieldStat> buildFieldStats(List<Booking> periodBookings) {
        List<Field> fields = fieldRepository.findAll();

        // Group booking theo field (truy cập field.getId() — field là LAZY
        // nhưng trong @Transactional thì hibernate vẫn có session nên ok)
        Map<UUID, List<Booking>> byField = periodBookings.stream()
                .collect(Collectors.groupingBy(b -> b.getField().getId()));

        return fields.stream().map(field -> {
            List<Booking> fb = byField.getOrDefault(field.getId(), List.of());
            long total     = fb.size();
            long confirmed = fb.stream().filter(b -> REVENUE_STATUSES.contains(b.getStatus())).count();
            BigDecimal rev = fb.stream()
                    .filter(b -> REVENUE_STATUSES.contains(b.getStatus()))
                    .map(Booking::getTotalAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Occupancy = confirmed booking / total booking (không dùng FieldSlot để tránh lazy)
            double occ = total == 0 ? 0.0
                    : Math.round(confirmed * 100.0 / total * 10) / 10.0;

            String typeLabel = switch (field.getType().name()) {
                case "FIVE_VS_FIVE"       -> "5v5";
                case "SEVEN_VS_SEVEN"     -> "7v7";
                case "ELEVEN_VS_ELEVEN"   -> "11v11";
                default                   -> field.getType().name();
            };

            return FieldStat.builder()
                    .fieldId(field.getId().toString())
                    .fieldName(field.getName())
                    .fieldCode(field.getCode())
                    .fieldType(typeLabel)
                    .totalBookings(total)
                    .confirmedBookings(confirmed)
                    .revenue(rev)
                    .occupancyRate(occ)
                    .build();
        })
        .sorted(Comparator.comparing(FieldStat::getRevenue).reversed())
        .toList();
    }

    private List<RecentBooking> buildRecentBookings(List<Booking> periodBookings) {
        DateTimeFormatter dtFmt   = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        return periodBookings.stream()
                .sorted(Comparator.comparing(Booking::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(20)
                .map(b -> {
                    // Lấy BookingSlot đầu tiên — vẫn trong transaction nên lazy load ok
                    List<BookingSlot> slots = bookingSlotRepository.findByBookingId(b.getId());
                    String slotDate = "";
                    String slotTime = "";
                    if (!slots.isEmpty()) {
                        BookingSlot first = slots.stream()
                                .min(Comparator.comparing(bs -> bs.getFieldSlot().getStartTime()))
                                .orElse(slots.get(0));
                        if (first.getFieldSlot().getSlotDate() != null)
                            slotDate = first.getFieldSlot().getSlotDate().format(dateFmt);
                        if (first.getFieldSlot().getStartTime() != null)
                            slotTime = first.getFieldSlot().getStartTime()
                                     + " - " + first.getFieldSlot().getEndTime();
                    }

                    return RecentBooking.builder()
                            .bookingId(b.getId().toString())
                            .bookingCode(b.getBookingCode())
                            .customerName(b.getAccount().getFullName())
                            .fieldName(b.getField().getName())
                            .bookingDate(b.getCreatedAt() != null ? b.getCreatedAt().format(dtFmt) : "")
                            .slotDate(slotDate)
                            .slotTime(slotTime)
                            .totalAmount(b.getTotalAmount())
                            .status(b.getStatus().name())
                            .build();
                })
                .toList();
    }
}
