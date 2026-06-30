package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "ASSEMBLY_ORDER_LINES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssemblyOrderLine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assembly_order_id", nullable = false)
    private AssemblyOrder assemblyOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "component_variant_id", nullable = false)
    private ProductVariant componentVariant;

    @Column(name = "quantity_required", nullable = false, precision = 15, scale = 4)
    private BigDecimal quantityRequired;

    @Column(name = "quantity_actual", nullable = false, precision = 15, scale = 4)
    private BigDecimal quantityActual;

    @Column(name = "unit_cost", nullable = false, precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal unitCost = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String note;
}
