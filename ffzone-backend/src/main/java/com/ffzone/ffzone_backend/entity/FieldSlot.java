package com.ffzone.ffzone_backend.entity;

import com.ffzone.ffzone_backend.enums.SlotStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import jakarta.persistence.Index;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Entity
// Sửa @Table annotation
@Table(name = "field_slots",
       uniqueConstraints = @UniqueConstraint(columnNames = {"field_id","slot_date","start_time"}),
       indexes = @Index(name = "idx_fieldslot_field_date", columnList = "field_id, slot_date"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FieldSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "field_id", nullable = false)
    private Field field;

    @Column(name = "slot_date", nullable = false)
    private LocalDate slotDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(nullable = false, precision = 12, scale = 0)
    @Builder.Default
    private BigDecimal price = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SlotStatus status = SlotStatus.AVAILABLE;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Integer version = 0;        // Optimistic Locking

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
