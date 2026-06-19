package com.ffzone.ffzone_backend.entity;

import com.ffzone.ffzone_backend.enums.ServiceCategory;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "services")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Service {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    // Danh mục dịch vụ — nhiều Service được phép cùng 1 category
    // (KHÔNG unique, khác bản trước chỉ cho 1 dịch vụ/loại)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ServiceCategory category;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 12, scale = 0)
    @Builder.Default
    private BigDecimal price = BigDecimal.ZERO;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}

