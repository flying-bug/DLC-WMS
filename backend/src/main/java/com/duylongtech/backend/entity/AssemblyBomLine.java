package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "ASSEMBLY_BOM_LINES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssemblyBomLine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assembly_bom_id", nullable = false)
    private AssemblyBom assemblyBom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "component_variant_id", nullable = false)
    private ProductVariant componentVariant;

    @Column(nullable = false, precision = 15, scale = 4)
    private BigDecimal quantity;

    @Column(name = "cost_allocation_pct", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal costAllocationPct = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String note;
}
