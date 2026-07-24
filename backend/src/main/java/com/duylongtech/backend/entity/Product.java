package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "PRODUCTS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "brand_id", nullable = true)
    private Brand brand;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = true)
    private ProductCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id", nullable = true)
    private Unit unit;

    @Column(name = "product_code", nullable = false, unique = true, length = 50)
    private String productCode;

    @Column(name = "product_name", nullable = false, length = 255)
    private String productName;

    // GOODS, SERVICE, FINISHED_PRODUCT, etc.
    @Column(name = "product_type", nullable = false, length = 50)
    private String productType;

    @Column(name = "sale_price", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal salePrice = BigDecimal.ZERO;

    @Column(name = "track_serial")
    @Builder.Default
    private Boolean trackSerial = false;

    @Column(name = "track_lot")
    @Builder.Default
    private Boolean trackLot = false;

    @Column(name = "is_assembly")
    @Builder.Default
    private Boolean isAssembly = false;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    // Trạng thái giảm thuế: Chưa xác định, Giảm, Không giảm
    @Column(name = "tax_reduction_status", length = 50)
    @Builder.Default
    private String taxReductionStatus = "Chưa xác định";

    // Số lượng tồn kho (để tiện CRUD trực tiếp cho MVP)
    @Column(name = "stock_qty", precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal stockQty = BigDecimal.ZERO;

    @Column(name = "min_stock_qty", precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal minStockQty = BigDecimal.ZERO;

    // Giá trị tồn kho (để tiện CRUD trực tiếp cho MVP)
    @Column(name = "stock_value", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal stockValue = BigDecimal.ZERO;

    // URL Hình ảnh đại diện
    @Column(name = "image_url", length = 255)
    private String imageUrl;
    @Column(name = "warranty_period", length = 50)
    private String warrantyPeriod;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ProductUnitConversion> unitConversions = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
