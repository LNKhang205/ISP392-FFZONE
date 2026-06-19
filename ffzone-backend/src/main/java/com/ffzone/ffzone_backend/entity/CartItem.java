package com.ffzone.ffzone_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "cart_items",
    uniqueConstraints = @UniqueConstraint(columnNames = {"cart_id", "service_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_id", nullable = false)
    private Cart cart;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private Service service;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantity = 1;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // Tính subtotal tại thời điểm đọc (không lưu vào DB, tránh stale price)
    public BigDecimal getSubtotal() {
        if (service == null || service.getPrice() == null) return BigDecimal.ZERO;
        return service.getPrice().multiply(BigDecimal.valueOf(quantity));
    }
}
