package com.duylongtech.backend.feature.inventory;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "INVENTORY_COST_LAYERS")
@Getter
@Setter
@NoArgsConstructor
public class InventoryCostLayer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "warehouse_id", nullable = false)
    private Long warehouseId;

    @Column(name = "variant_id", nullable = false)
    private Long variantId;

    @Column(name = "inventory_document_line_id", nullable = false)
    private Long inventoryDocumentLineId;

    @Column(name = "quantity_received", nullable = false, precision = 15, scale = 4)
    private BigDecimal quantityReceived;

    @Column(name = "quantity_layered", nullable = false, precision = 15, scale = 4)
    private BigDecimal quantityLayered;

    @Column(name = "quantity_reserved", nullable = false, precision = 15, scale = 4)
    private BigDecimal quantityReserved = BigDecimal.ZERO;

    @Column(name = "unit_cost", nullable = false, precision = 15, scale = 4)
    private BigDecimal unitCost;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public void initCostLayer(Long warehouseId, Long variantId, Long inventoryDocumentLineId, BigDecimal quantityReceived, BigDecimal quantityLayered, BigDecimal unitCost) {
        this.warehouseId = warehouseId;
        this.variantId = variantId;
        this.inventoryDocumentLineId = inventoryDocumentLineId;
        this.quantityReceived = quantityReceived;
        this.quantityLayered = quantityLayered;
        this.quantityReserved = BigDecimal.ZERO;
        this.unitCost = unitCost;
        this.createdAt = LocalDateTime.now();
    }
}
