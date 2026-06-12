package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "INVENTORY_COST_LAYERS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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

    @Column(name = "unit_cost", nullable = false, precision = 15, scale = 4)
    private BigDecimal unitCost;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
