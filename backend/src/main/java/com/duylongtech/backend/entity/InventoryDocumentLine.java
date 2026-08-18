package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "INVENTORY_DOCUMENT_LINES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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
}
