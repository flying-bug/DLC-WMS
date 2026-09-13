package com.duylongtech.backend.feature.sales_order;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.warehouse.Warehouse;

@Entity
@Table(name = "SALES_ORDER_LINES")
@Getter
@NoArgsConstructor
public class SalesOrderLine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sales_order_id", nullable = false)
    private Long salesOrderId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_order_id", insertable = false, updatable = false)
    private SalesOrder salesOrder;

    @Column(name = "variant_id", nullable = false)
    private Long variantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id", insertable = false, updatable = false)
    private ProductVariant variant;

    @Column(name = "quantity", nullable = false, precision = 15, scale = 4)
    private BigDecimal quantity;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 4)
    private BigDecimal unitPrice;

    @Column(name = "line_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal lineAmount = BigDecimal.ZERO;

    @Column(name = "cost_amount", precision = 15, scale = 2)
    private BigDecimal costAmount = BigDecimal.ZERO;

    @Column(name = "vat_rate", precision = 5, scale = 2)
    private BigDecimal vatRate = BigDecimal.ZERO;

    @Column(name = "vat_amount", precision = 15, scale = 2)
    private BigDecimal vatAmount = BigDecimal.ZERO;

    @Column(name = "warranty_months")
    private Integer warrantyMonths;

    @Column(name = "warehouse_id")
    private Long warehouseId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", insertable = false, updatable = false)
    private Warehouse warehouse;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    // --- Domain Logic ---

    public void initLine(Long variantId, BigDecimal quantity, BigDecimal unitPrice, BigDecimal vatRate, Long warehouseId, Integer warrantyMonths, String note) {
        this.variantId = variantId;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.vatRate = vatRate != null ? vatRate : BigDecimal.ZERO;
        this.warehouseId = warehouseId;
        this.warrantyMonths = warrantyMonths;
        this.note = note;
    }

    void setSalesOrder(SalesOrder salesOrder) {
        this.salesOrder = salesOrder;
    }

    void setSalesOrderId(Long salesOrderId) {
        this.salesOrderId = salesOrderId;
    }

    void setCostAmount(BigDecimal costAmount) {
        this.costAmount = costAmount;
    }

    public void calculateAmounts() {
        if (this.quantity == null) this.quantity = BigDecimal.ZERO;
        if (this.unitPrice == null) this.unitPrice = BigDecimal.ZERO;
        
        this.lineAmount = this.unitPrice.multiply(this.quantity);
        
        if (this.vatRate != null && this.vatRate.compareTo(BigDecimal.ZERO) > 0) {
            this.vatAmount = this.lineAmount.multiply(this.vatRate).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        } else {
            this.vatAmount = BigDecimal.ZERO;
        }
    }
}

