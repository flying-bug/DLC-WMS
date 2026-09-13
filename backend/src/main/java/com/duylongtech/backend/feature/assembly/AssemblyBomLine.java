package com.duylongtech.backend.feature.assembly;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import com.duylongtech.backend.feature.product.ProductVariant;

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

    @Setter(AccessLevel.NONE)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "component_variant_id", nullable = true)
    private ProductVariant componentVariant;

    @Setter(AccessLevel.NONE)
    @Column(name = "quantity", nullable = false, precision = 15, scale = 4)
    private BigDecimal quantity;

    @Setter(AccessLevel.NONE)
    @Column(name = "component_role", length = 100)
    private String componentRole;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Setter(AccessLevel.NONE)
    @Column(name = "unit_price", precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Setter(AccessLevel.NONE)
    @Column(name = "component_sku", length = 100)
    private String componentSku;

    @Setter(AccessLevel.NONE)
    @Column(name = "component_name", length = 255)
    private String componentName;

    @Setter(AccessLevel.NONE)
    @Column(name = "warranty_months")
    private Integer warrantyMonths;

    public void initLine(ProductVariant componentVariant, BigDecimal quantity, String componentRole, String note, BigDecimal unitPrice, String componentSku, String componentName, Integer warrantyMonths) {
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số lượng phải lớn hơn 0");
        }
        this.componentVariant = componentVariant;
        this.quantity = quantity;
        this.componentRole = componentRole;
        this.note = note;
        this.unitPrice = unitPrice != null ? unitPrice : BigDecimal.ZERO;
        this.componentSku = componentSku;
        this.componentName = componentName;
        this.warrantyMonths = warrantyMonths;
    }

    public void updateLine(ProductVariant componentVariant, BigDecimal quantity, String componentRole, String note, BigDecimal unitPrice, String componentSku, String componentName, Integer warrantyMonths) {
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số lượng phải lớn hơn 0");
        }
        this.componentVariant = componentVariant;
        this.quantity = quantity;
        this.componentRole = componentRole;
        this.note = note;
        this.unitPrice = unitPrice;
        this.componentSku = componentSku;
        this.componentName = componentName;
        this.warrantyMonths = warrantyMonths;
    }
}
