package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "component_variant_id", nullable = false, insertable = false, updatable = false)
    private ProductVariant componentVariant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repair_id", nullable = false)
    private Repair repair;

    @Column(name = "component_variant_id", nullable = false)
    private Long componentVariantId;

    @Column(name = "action_type", nullable = false, length = 20)
    private String actionType; // "ADD" or "REMOVE"

    @Column(name = "serial_number_id")
    private Long serialNumberId;

    @Column(nullable = false, precision = 15, scale = 4)
    private BigDecimal quantity;

    @Column(name = "done_quantity", precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal doneQuantity = BigDecimal.ZERO;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @Column(name = "is_warranty_covered", nullable = false)
    @Builder.Default
    private Boolean isWarrantyCovered = false;

    @Column(name = "is_free_warranty", nullable = false)
    @Builder.Default
    private Boolean isFreeWarranty = false;

    @Column(name = "is_used", nullable = false)
    @Builder.Default
    private Boolean isUsed = false;

    @Column(name = "date_scheduled")
    private java.time.LocalDate dateScheduled;

    @Column(name = "deadline")
    private java.time.LocalDate deadline;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
