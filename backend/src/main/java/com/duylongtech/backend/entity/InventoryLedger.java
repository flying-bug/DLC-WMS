package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "INVENTORY_LEDGER")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryLedger {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "inventory_document_id", nullable = false)
    private Long inventoryDocumentId;

    @Column(name = "inventory_document_line_id", nullable = false)
    private Long inventoryDocumentLineId;

    @Column(name = "warehouse_id", nullable = false)
    private Long warehouseId;

    @Column(name = "variant_id", nullable = false)
    private Long variantId;

    @Column(name = "serial_number_id")
    private Long serialNumberId;

    @Column(name = "lot_batch_id")
    private Long lotBatchId;

    @Column(name = "movement_type", nullable = false, length = 30)
    private String movementType;

    @Column(name = "quantity_in", nullable = false, precision = 15, scale = 4)
    private BigDecimal quantityIn;

    @Column(name = "quantity_out", nullable = false, precision = 15, scale = 4)
    private BigDecimal quantityOut;

    @Column(name = "unit_cost", nullable = false, precision = 15, scale = 4)
    private BigDecimal unitCost;

    @Column(name = "balance_after", nullable = false, precision = 15, scale = 4)
    private BigDecimal balanceAfter;

    @Column(name = "movement_at", nullable = false)
    private LocalDateTime movementAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
