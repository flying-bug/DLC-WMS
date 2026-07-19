package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "REPAIR_LINES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RepairLine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "repair_id", nullable = false)
    private Long repairId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repair_id", insertable = false, updatable = false)
    private Repair repair;

    @Column(name = "component_variant_id", nullable = false)
    private Long componentVariantId;

    @Column(name = "action_type", nullable = false, length = 20)
    private String actionType; // 'ADD' or 'REMOVE'

    @Column(name = "quantity", nullable = false, precision = 15, scale = 4)
    private BigDecimal quantity;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @Column(name = "is_free_warranty", nullable = false)
    @Builder.Default
    private Boolean isFreeWarranty = false;

    @Column(name = "serial_number_id")
    private Long serialNumberId;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;
}
