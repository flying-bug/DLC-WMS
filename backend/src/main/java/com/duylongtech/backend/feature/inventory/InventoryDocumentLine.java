package com.duylongtech.backend.feature.inventory;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import com.duylongtech.backend.feature.warranty.Warranty;

@Entity
@Table(name = "INVENTORY_DOCUMENT_LINES")
@Getter
@Setter
@NoArgsConstructor
public class InventoryDocumentLine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_document_id", nullable = false)
    private InventoryDocument inventoryDocument;

    @Column(name = "variant_id")
    private Long variantId;

    @Column(name = "quantity_in", precision = 15, scale = 4)
    private BigDecimal quantityIn;

    @Column(name = "quantity_out", precision = 15, scale = 4)
    private BigDecimal quantityOut;

    @Column(name = "unit_cost", precision = 15, scale = 4)
    private BigDecimal unitCost;

    @Column(name = "unit_price", precision = 15, scale = 4)
    private BigDecimal unitPrice;

    @Column(name = "vat_rate", precision = 5, scale = 2)
    private BigDecimal vatRate;

    @Column(name = "line_amount", precision = 15, scale = 2)
    private BigDecimal lineAmount;

    @Column(name = "lot_batch_id")
    private Long lotBatchId;

    @Column(name = "serial_number_id")
    private Long serialNumberId;

    @Column(name = "serial_numbers_text", columnDefinition = "TEXT")
    private String serialNumbersText;

    @Column(name = "repair_line_id")
    private Long repairLineId;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    /**
     * Thời hạn bảo hành (tính theo tháng) cho dòng sản phẩm này.
     * Nếu null hoặc <= 0, không sinh phiếu WARRANTY tự động khi POST phiếu xuất.
     */
    @Column(name = "warranty_months")
    private Integer warrantyMonths;

    @Column(name = "vat_percent", precision = 5, scale = 2)
    private BigDecimal vatPercent;

    @Column(name = "warehouse_id")
    private Long warehouseId;

    @Column(name = "target_warehouse_id")
    private Long targetWarehouseId;

    @Column(name = "expected_quantity", precision = 15, scale = 4)
    private BigDecimal expectedQuantity;

    @Column(name = "rejected_quantity", precision = 15, scale = 4)
    private BigDecimal rejectedQuantity;

    @Column(name = "discrepancy_reason", length = 255)
    private String discrepancyReason;

    @Column(name = "unit_id")
    private Long unitId;

    @Column(name = "base_unit_id")
    private Long baseUnitId;

    @Column(name = "conversion_operator", length = 20)
    private String conversionOperator;

    @Column(name = "conversion_ratio", precision = 15, scale = 4)
    private BigDecimal conversionRatio;

    @Column(name = "base_quantity", precision = 15, scale = 4)
    private BigDecimal baseQuantity;

    // --- Domain Logic ---

    public void calculateExportAmounts() {
        if (this.quantityOut == null) this.quantityOut = BigDecimal.ZERO;
        if (this.unitPrice == null) this.unitPrice = BigDecimal.ZERO;
        
        BigDecimal subtotal = this.quantityOut.multiply(this.unitPrice);
        BigDecimal actualVatRate = this.vatRate != null ? this.vatRate : (this.vatPercent != null ? this.vatPercent : BigDecimal.ZERO);
        
        BigDecimal vatAmount = subtotal.multiply(actualVatRate).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        this.lineAmount = subtotal.add(vatAmount).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    public void calculateImportAmounts() {
        if (this.quantityIn == null) this.quantityIn = BigDecimal.ZERO;
        if (this.unitCost == null) this.unitCost = BigDecimal.ZERO;
        
        BigDecimal subtotal = this.quantityIn.multiply(this.unitCost);
        BigDecimal actualVatRate = this.vatRate != null ? this.vatRate : (this.vatPercent != null ? this.vatPercent : BigDecimal.ZERO);
        
        BigDecimal vatAmount = subtotal.multiply(actualVatRate).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        this.lineAmount = subtotal.add(vatAmount).setScale(2, java.math.RoundingMode.HALF_UP);
    }
}
