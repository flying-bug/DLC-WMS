package com.duylongtech.backend.feature.warranty;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.SerialNumber;

@Entity
@Table(name = "WARRANTY_LINES")
@Getter
@Setter
@NoArgsConstructor
public class WarrantyLine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warranty_id", nullable = false)
    private Warranty warranty;

    @Column(name = "serial_number_id")
    private Long serialNumberId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "serial_number_id", insertable = false, updatable = false)
    private SerialNumber serialNumber;

    @Column(name = "product_variant_id")
    private Long productVariantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_variant_id", insertable = false, updatable = false)
    private ProductVariant productVariant;

    @Column(name = "quantity")
    private BigDecimal quantity;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "warranty_status", nullable = false, length = 30)
    private String warrantyStatus;

    public void initLine(Warranty warranty, Long serialNumberId, Long productVariantId, BigDecimal quantity, LocalDate startDate, LocalDate endDate, String warrantyStatus) {
        this.warranty = warranty;
        this.serialNumberId = serialNumberId;
        this.productVariantId = productVariantId;
        this.quantity = quantity;
        this.startDate = startDate;
        this.endDate = endDate;
        this.warrantyStatus = warrantyStatus;
    }
}
