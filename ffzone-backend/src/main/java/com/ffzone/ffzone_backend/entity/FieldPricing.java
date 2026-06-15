package com.ffzone.ffzone_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "field_pricing")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FieldPricing {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "field_id", nullable = false)
    private Field field;

    @Column(nullable = false, precision = 12, scale = 0)
    private BigDecimal price;

    @Column(name = "day_of_week", nullable = false, length = 10)
    private String dayOfWeek;   // WEEKDAY | WEEKEND | HOLIDAY

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    /**
     * Chỉ có giá trị khi dayOfWeek = HOLIDAY.
     * Ví dụ: "Tết Nguyên Đán", "Quốc khánh 2/9".
     * Lưu vào DB để admin có thể xem và xóa theo tên dịp lễ.
     */
    @Column(name = "holiday_name", length = 100)
    private String holidayName;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
