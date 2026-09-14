package com.duylongtech.backend.feature.purchase_order;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.warehouse.Warehouse;

@Entity
@Table(name = "PURCHASE_ORDER_LINES")
@Getter
@NoArgsConstructor
public class PurchaseOrderLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Chỉ đọc - FK thật sự do quan hệ purchaseOrder bên dưới ghi (xem SalesOrderLine
    // cho cùng 1 lỗi/cách sửa: field thô này không thể set được lúc addLine() vì đơn
    // mới còn chưa có id, gây "Column 'purchase_order_id' cannot be null").
    @Column(name = "purchase_order_id", nullable = false, insertable = false, updatable = false)
    private Long purchaseOrderId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id", nullable = false, updatable = false)
    private PurchaseOrder purchaseOrder;

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

    @Column(name = "vat_rate", precision = 5, scale = 2)
    private BigDecimal vatRate = BigDecimal.ZERO;

    @Column(name = "vat_amount", precision = 15, scale = 2)
    private BigDecimal vatAmount = BigDecimal.ZERO;

    @Column(name = "warehouse_id")
    private Long warehouseId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", insertable = false, updatable = false)
    private Warehouse warehouse;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    public void initLine(Long variantId, BigDecimal quantity, BigDecimal unitPrice, BigDecimal vatRate, Long warehouseId, String note) {
        this.variantId = variantId;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.vatRate = vatRate != null ? vatRate : BigDecimal.ZERO;
        this.warehouseId = warehouseId;
        this.note = note;
    }

    void setPurchaseOrder(PurchaseOrder purchaseOrder) {
        this.purchaseOrder = purchaseOrder;
    }

    public void calculateAmounts() {
        if (this.quantity == null) this.quantity = BigDecimal.ZERO;
        if (this.unitPrice == null) this.unitPrice = BigDecimal.ZERO;
        
        BigDecimal rawLineAmount = this.quantity.multiply(this.unitPrice);
        this.lineAmount = rawLineAmount;

        if (this.vatRate == null) {
            this.vatRate = BigDecimal.ZERO;
        }

        this.vatAmount = rawLineAmount.multiply(this.vatRate).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
    }
}
