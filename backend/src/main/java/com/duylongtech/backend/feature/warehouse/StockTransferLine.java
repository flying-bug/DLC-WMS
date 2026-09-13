package com.duylongtech.backend.feature.warehouse;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "STOCK_TRANSFER_LINES")
@Getter
@NoArgsConstructor
public class StockTransferLine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_transfer_id", nullable = false)
    private StockTransfer stockTransfer;

    @Column(name = "variant_id", nullable = false)
    private Long variantId;

    @Column(name = "quantity", nullable = false, precision = 15, scale = 4)
    private BigDecimal quantity;

    @Column(name = "unit_cost", nullable = false, precision = 15, scale = 4)
    private BigDecimal unitCost;

    @Column(name = "serial_numbers_text", columnDefinition = "TEXT")
    private String serialNumbersText;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    public void initLine(Long variantId, BigDecimal quantity, BigDecimal unitCost, String serialNumbersText, String note) {
        this.variantId = variantId;
        this.quantity = quantity;
        this.unitCost = unitCost != null ? unitCost : BigDecimal.ZERO;
        this.serialNumbersText = serialNumbersText;
        this.note = note;
    }

    public void setStockTransfer(StockTransfer stockTransfer) {
        this.stockTransfer = stockTransfer;
    }

    public void updateUnitCost(BigDecimal unitCost) {
        if (unitCost != null) {
            this.unitCost = unitCost;
        }
    }
}
