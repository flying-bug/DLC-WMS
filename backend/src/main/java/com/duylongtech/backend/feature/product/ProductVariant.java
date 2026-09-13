package com.duylongtech.backend.feature.product;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "PRODUCT_VARIANTS")
@Getter
@NoArgsConstructor
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
    
    private BigDecimal costPrice = BigDecimal.ZERO;

    @Column(name = "sale_price", nullable = false, precision = 15, scale = 4)
    
    private BigDecimal salePrice = BigDecimal.ZERO;

    @Column(name = "manufacturer_part_number", length = 100)
    private String manufacturerPartNumber;

    @Column(name = "specs_json", columnDefinition = "TEXT")
    private String specsJson;

    @Column(name = "tracking_mode", nullable = false, length = 20)
    
    private String trackingMode = "NONE";

    @Column(name = "min_stock_qty", nullable = false, precision = 15, scale = 4)
    
    private BigDecimal minStockQty = BigDecimal.ZERO;

    @Column(name = "warranty_months")
    
    private Integer warrantyMonths = 0;

    @Column(nullable = false)
    
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public boolean isSerialTracked() {
        return "SERIAL".equals(trackingMode) || "SERIAL_LOT".equals(trackingMode);
    }

    public boolean isLotTracked() {
        return "LOT".equals(trackingMode) || "SERIAL_LOT".equals(trackingMode);
    }

    public void initVariant(Product product, String sku, String barcode, String variantName) {
        this.product = product;
        this.sku = sku;
        this.barcode = barcode;
        this.variantName = variantName;
        this.costPrice = BigDecimal.ZERO;
        this.salePrice = BigDecimal.ZERO;
        this.trackingMode = "NONE";
        this.minStockQty = BigDecimal.ZERO;
        this.warrantyMonths = 0;
        this.active = true;
    }

    public void updateDetails(String variantName, String barcode, String manufacturerPartNumber, String specsJson) {
        if (variantName != null) this.variantName = variantName;
        if (barcode != null) this.barcode = barcode;
        if (manufacturerPartNumber != null) this.manufacturerPartNumber = manufacturerPartNumber;
        if (specsJson != null) this.specsJson = specsJson;
    }
    
    public void updatePricing(BigDecimal costPrice, BigDecimal salePrice) {
        if (costPrice != null) this.costPrice = costPrice;
        if (salePrice != null) this.salePrice = salePrice;
    }

    public void activate() {
        this.active = true;
    }
    
    public void deactivate() {
        this.active = false;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public void setTrackingMode(String trackingMode) {
        this.trackingMode = trackingMode;
    }

    public void setMinStockQty(BigDecimal minStockQty) {
        this.minStockQty = minStockQty;
    }

    public void setWarrantyMonths(Integer warrantyMonths) {
        this.warrantyMonths = warrantyMonths;
    }

    public void setSalePrice(BigDecimal salePrice) {
        this.salePrice = salePrice;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public void setManufacturerPartNumber(String manufacturerPartNumber) {
        this.manufacturerPartNumber = manufacturerPartNumber;
    }

    public void setSpecsJson(String specsJson) {
        this.specsJson = specsJson;
    }
}
