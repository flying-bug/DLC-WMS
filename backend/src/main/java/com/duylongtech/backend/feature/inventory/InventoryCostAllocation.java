package com.duylongtech.backend.feature.inventory;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "INVENTORY_COST_ALLOCATIONS")
@Getter
@Setter
@NoArgsConstructor
public class InventoryCostAllocation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "inventory_document_line_id", nullable = false)
    private Long inventoryDocumentLineId;

    @Column(name = "cost_layer_id", nullable = false)
    private Long costLayerId;

    @Column(nullable = false, precision = 15, scale = 4)
    private BigDecimal quantity;

    @Column(name = "unit_cost", nullable = false, precision = 15, scale = 4)
    private BigDecimal unitCost;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public void init(Long lineId, InventoryCostLayer layer, BigDecimal quantity, String status) {
        this.inventoryDocumentLineId = lineId;
        this.costLayerId = layer.getId();
        this.quantity = quantity;
        this.unitCost = layer.getUnitCost();
        this.status = status;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    public void changeStatus(String status) {
        this.status = status;
        this.updatedAt = LocalDateTime.now();
    }
}
