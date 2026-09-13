package com.duylongtech.backend.feature.product;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.duylongtech.backend.feature.brand.Brand;

@Entity
@Table(name = "PRODUCTS")
@Getter
@NoArgsConstructor
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
    
    private BigDecimal salePrice = BigDecimal.ZERO;

    @Column(name = "vat_rate", precision = 5, scale = 2)
    
    private BigDecimal vatRate = BigDecimal.valueOf(8);

    @Column(name = "track_serial")
    
    private Boolean trackSerial = false;

    @Column(name = "track_lot")
    
    private Boolean trackLot = false;

    @Column(name = "is_assembly")
    
    private Boolean isAssembly = false;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "bom_template", columnDefinition = "TEXT")
    private String bomTemplate;

    @Column(nullable = false)
    
    private Boolean active = true;

    // Trạng thái giảm thuế: Chưa xác định, Giảm, Không giảm
    @Column(name = "tax_reduction_status", length = 50)
    
    private String taxReductionStatus = "Chưa xác định";

    // Số lượng tồn kho (để tiện CRUD trực tiếp cho MVP)
    @Column(name = "stock_qty", precision = 15, scale = 4)
    
    private BigDecimal stockQty = BigDecimal.ZERO;

    @Column(name = "min_stock_qty", precision = 15, scale = 4)
    
    private BigDecimal minStockQty = BigDecimal.ZERO;

    // Giá trị tồn kho (để tiện CRUD trực tiếp cho MVP)
    @Column(name = "stock_value", precision = 15, scale = 2)
    
    private BigDecimal stockValue = BigDecimal.ZERO;

    // URL Hình ảnh đại diện
    @Column(name = "image_url", length = 255)
    private String imageUrl;
    @Column(name = "warranty_period", length = 50)
    private String warrantyPeriod;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    
    private List<ProductUnitConversion> unitConversions = new ArrayList<>();

    @Column(name = "warranty_period_months")
    private Integer warrantyPeriodMonths;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void initProduct(String productCode, String productName, String productType, Brand brand, ProductCategory category, Unit unit, String description) {
        this.productCode = productCode;
        this.productName = productName;
        this.productType = productType;
        this.brand = brand;
        this.category = category;
        this.unit = unit;
        this.description = description;
        this.salePrice = BigDecimal.ZERO;
        this.vatRate = BigDecimal.valueOf(8);
        this.trackSerial = false;
        this.trackLot = false;
        this.isAssembly = false;
        this.active = true;
        this.taxReductionStatus = "Chưa xác định";
        this.stockQty = BigDecimal.ZERO;
        this.minStockQty = BigDecimal.ZERO;
        this.stockValue = BigDecimal.ZERO;
        this.unitConversions = new ArrayList<>();
    }

    public void updateDetails(String productName, Brand brand, ProductCategory category, Unit unit, String description) {
        if (productName != null) this.productName = productName;
        if (brand != null) this.brand = brand;
        if (category != null) this.category = category;
        if (unit != null) this.unit = unit;
        if (description != null) this.description = description;
    }

    public void updatePricing(BigDecimal salePrice, BigDecimal vatRate, String taxReductionStatus) {
        if (salePrice != null) this.salePrice = salePrice;
        if (vatRate != null) this.vatRate = vatRate;
        if (taxReductionStatus != null) this.taxReductionStatus = taxReductionStatus;
    }

    public void updateTracking(Boolean trackSerial, Boolean trackLot, Boolean isAssembly) {
        if (trackSerial != null) this.trackSerial = trackSerial;
        if (trackLot != null) this.trackLot = trackLot;
        if (isAssembly != null) this.isAssembly = isAssembly;
    }

    public void updateStock(BigDecimal stockQty, BigDecimal stockValue) {
        if (stockQty != null) this.stockQty = stockQty;
        if (stockValue != null) this.stockValue = stockValue;
    }
    
    public void activate() {
        this.active = true;
    }
    
    public void deactivate() {
        this.active = false;
    }

    public void setBrand(Brand brand) {
        this.brand = brand;
    }

    public void setCategory(ProductCategory category) {
        this.category = category;
    }

    public void setUnit(Unit unit) {
        this.unit = unit;
    }

    public void setUnitConversions(List<ProductUnitConversion> unitConversions) {
        this.unitConversions = unitConversions;
    }

    public void setProductCode(String productCode) {
        this.productCode = productCode;
    }
    
    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
}
