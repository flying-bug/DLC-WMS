package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "WARRANTY_LINES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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
}
