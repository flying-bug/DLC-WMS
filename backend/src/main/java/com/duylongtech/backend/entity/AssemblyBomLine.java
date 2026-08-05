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
    @JoinColumn(name = "component_variant_id", nullable = true)
    private ProductVariant componentVariant;

    @Column(name = "quantity", nullable = false, precision = 15, scale = 4)
    private BigDecimal quantity;

    @Column(name = "component_role", length = 100)
    private String componentRole;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "unit_price", precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "component_sku", length = 100)
    private String componentSku;

    @Column(name = "component_name", length = 255)
    private String componentName;

    @Column(name = "warranty_months")
    private Integer warrantyMonths;
}
