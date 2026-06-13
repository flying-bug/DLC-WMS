package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "INVENTORY_BALANCES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryBalance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "warehouse_id", nullable = false)
    private Long warehouseId;

    @Column(name = "variant_id", nullable = false)
    private Long variantId;

    @Column(name = "serial_number_id")
    private Long serialNumberId;

    @Column(name = "lot_batch_id")
    private Long lotBatchId;

    @Column(name = "stock_status", nullable = false, length = 30)
    private String stockStatus;

    @Column(name = "quantity_on_hand", nullable = false, precision = 15, scale = 4)
    private BigDecimal quantityOnHand;

    @Column(name = "quantity_reserved", nullable = false, precision = 15, scale = 4)
    private BigDecimal quantityReserved;

    @Column(name = "average_cost", nullable = false, precision = 15, scale = 4)
    private BigDecimal averageCost;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
