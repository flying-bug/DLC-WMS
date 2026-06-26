package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "PRODUCT_VARIANTS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductVariant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, unique = true, length = 50)
    private String sku;

    @Column(name = "barcode", unique = true, length = 100)
    private String barcode;

    @Column(name = "variant_name", nullable = false, length = 255)
    private String variantName;

    @Column(name = "cost_price", nullable = false, precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal costPrice = BigDecimal.ZERO;

    @Column(name = "sale_price", nullable = false, precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal salePrice = BigDecimal.ZERO;

    @Column(name = "manufacturer_part_number", length = 100)
    private String manufacturerPartNumber;

    @Column(name = "specs_json", columnDefinition = "TEXT")
    private String specsJson;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
