package com.duylongtech.backend.feature.assembly;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import com.duylongtech.backend.feature.product.ProductVariant;

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
    @Setter(AccessLevel.NONE)
    private BigDecimal quantityRequired;

    @Column(name = "quantity_actual", nullable = false, precision = 15, scale = 4)
    @Setter(AccessLevel.NONE)
    private BigDecimal quantityActual;

    @Column(name = "unit_cost", nullable = false, precision = 15, scale = 4)
    @Builder.Default
    @Setter(AccessLevel.NONE)
    private BigDecimal unitCost = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String note;

    public void initLine(ProductVariant componentVariant, BigDecimal quantityRequired, BigDecimal unitCost, String note) {
        if (quantityRequired == null || quantityRequired.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số lượng yêu cầu phải lớn hơn 0");
        }
        this.componentVariant = componentVariant;
        this.quantityRequired = quantityRequired;
        this.quantityActual = BigDecimal.ZERO;
        this.unitCost = unitCost != null ? unitCost : BigDecimal.ZERO;
        this.note = note;
    }

    public void updateActualQuantity(BigDecimal actual) {
        if (actual == null || actual.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Số lượng thực tế không được âm");
        }
        this.quantityActual = actual;
    }
}
