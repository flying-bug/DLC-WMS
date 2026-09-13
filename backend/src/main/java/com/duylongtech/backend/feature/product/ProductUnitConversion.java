package com.duylongtech.backend.feature.product;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "PRODUCT_UNIT_CONVERSIONS")
@Getter
@NoArgsConstructor
public class ProductUnitConversion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id", nullable = false)
    private Unit unit;

    @Column(nullable = false, length = 20)
    private String operator; // "MULTIPLY" or "DIVIDE"

    @Column(nullable = false, precision = 15, scale = 4)
    private BigDecimal ratio;

    @Column(columnDefinition = "TEXT")
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void initConversion(Product product, Unit unit, String operator, BigDecimal ratio, String note) {
        this.product = product;
        this.unit = unit;
        this.operator = operator;
        this.ratio = ratio;
        this.note = note;
    }
}
