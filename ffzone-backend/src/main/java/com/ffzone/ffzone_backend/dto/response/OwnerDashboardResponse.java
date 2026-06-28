package com.ffzone.ffzone_backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class OwnerDashboardResponse {

    // ── Tổng quan ──────────────────────────────────────────────────────────
    private BigDecimal totalRevenue;         // tổng từ CONFIRMED/COMPLETED/IN_PROGRESS
    private long totalBookings;
    private long confirmedBookings;
    private long cancelledBookings;
    private double successRate;              // % confirmed / total
    private BigDecimal avgRevenuePerBooking;

    // ── Doanh thu theo ngày (7 hoặc 30 ngày gần đây) ──────────────────────
    private List<DailyRevenue> revenueByDay;

    // ── Thống kê theo từng sân ─────────────────────────────────────────────
    private List<FieldStat> fieldStats;

    // ── Booking gần đây ────────────────────────────────────────────────────
    private List<RecentBooking> recentBookings;

    // ── Inner classes ──────────────────────────────────────────────────────

    @Data @Builder
    public static class DailyRevenue {
        private String date;         // "dd/MM"
        private BigDecimal revenue;
        private long bookingCount;
    }

    @Data @Builder
    public static class FieldStat {
        private String fieldId;
        private String fieldName;
        private String fieldCode;
        private String fieldType;
        private long totalBookings;
        private long confirmedBookings;
        private BigDecimal revenue;
        private double occupancyRate;   // % slot đã đặt (confirmed) / tổng slot tồn tại
    }

    @Data @Builder
    public static class RecentBooking {
        private String bookingId;
        private String bookingCode;
        private String customerName;
        private String fieldName;
        private String bookingDate;  // ngày tạo booking "dd/MM/yyyy HH:mm"
        private String slotDate;     // ngày chơi (slot đầu tiên)
        private String slotTime;     // "08:00 - 09:00"
        private BigDecimal totalAmount;
        private String status;
    }
}
