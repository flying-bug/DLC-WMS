package com.duylongtech.backend.feature.purchase_order;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.warehouse.Warehouse;

@Entity
@Table(name = "PURCHASE_ORDER_LINES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrderLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "purchase_order_id", nullable = false)
    private Long purchaseOrderId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id", insertable = false, updatable = false)
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

    @Setter(AccessLevel.NONE)
    @Column(name = "line_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal lineAmount;

    @Column(name = "vat_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal vatRate = BigDecimal.ZERO;

    @Setter(AccessLevel.NONE)
    @Column(name = "vat_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal vatAmount = BigDecimal.ZERO;

    @Column(name = "warehouse_id")
    private Long warehouseId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", insertable = false, updatable = false)
    private Warehouse warehouse;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

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
