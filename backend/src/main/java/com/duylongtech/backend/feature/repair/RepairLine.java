package com.duylongtech.backend.feature.repair;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import com.duylongtech.backend.feature.product.ProductVariant;

@Entity
@Table(name = "REPAIR_LINES")
@Getter
@Setter
@NoArgsConstructor
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

    @Setter(AccessLevel.NONE)
    @Column(name = "component_variant_id", nullable = false)
    private Long componentVariantId;

    @Setter(AccessLevel.NONE)
    @Column(name = "action_type", nullable = false, length = 20)
    private String actionType; // "ADD" or "REMOVE"

    @Column(name = "serial_number_id")
    private Long serialNumberId;

    @Column(name = "serial_number_text", length = 255)
    private String serialNumberText;

    @Column(name = "replacement_serial_number_id")
    private Long replacementSerialNumberId;

    @Column(name = "replacement_serial_number_text", length = 255)
    private String replacementSerialNumberText;

    @Setter(AccessLevel.NONE)
    @Column(nullable = false, precision = 15, scale = 4)
    private BigDecimal quantity;

    @Setter(AccessLevel.NONE)
    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @Column(name = "is_warranty_covered", nullable = false)
    private Boolean isWarrantyCovered = false;

    @Setter(AccessLevel.NONE)
    @Column(name = "is_free_warranty", nullable = false)
    private Boolean isFreeWarranty = false;

    @Setter(AccessLevel.NONE)
    @Column(name = "vat_percent", precision = 5, scale = 2)
    private BigDecimal vatPercent = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public void initLine(Long componentVariantId, String actionType, BigDecimal quantity, BigDecimal unitPrice, Boolean isFreeWarranty, Long serialNumberId, String serialNumberText, Long replacementSerialNumberId, String replacementSerialNumberText, BigDecimal vatPercent, String note) {
        this.componentVariantId = componentVariantId;
        this.actionType = actionType;
        this.quantity = quantity;
        this.unitPrice = isFreeWarranty ? BigDecimal.ZERO : (unitPrice != null ? unitPrice : BigDecimal.ZERO);
        this.isFreeWarranty = isFreeWarranty;
        this.serialNumberId = serialNumberId;
        this.serialNumberText = serialNumberText;
        this.replacementSerialNumberId = replacementSerialNumberId;
        this.replacementSerialNumberText = replacementSerialNumberText;
        this.vatPercent = vatPercent != null ? vatPercent : BigDecimal.ZERO;
        this.note = note;
    }

    public void applyWarrantyZeroPrice() {
        this.unitPrice = BigDecimal.ZERO;
        this.isFreeWarranty = true;
    }

    public void updateDetails(Long componentVariantId, BigDecimal quantity, String actionType, BigDecimal unitPrice, Boolean isFreeWarranty, BigDecimal vatPercent, String note, Long serialNumberId, String serialNumberText, Long replacementSerialNumberId, String replacementSerialNumberText) {
        if (componentVariantId != null && !componentVariantId.equals(this.componentVariantId)) {
            this.componentVariantId = componentVariantId;
            this.serialNumberId = null;
            this.serialNumberText = null;
            this.replacementSerialNumberId = null;
            this.replacementSerialNumberText = null;
        }
        if (quantity != null) this.quantity = quantity;
        if (actionType != null) {
            if (!actionType.equals(this.actionType)) {
                this.actionType = actionType;
                this.serialNumberId = null;
                this.serialNumberText = null;
                this.replacementSerialNumberId = null;
                this.replacementSerialNumberText = null;
            }
        }
        if (unitPrice != null) this.unitPrice = unitPrice;
        if (isFreeWarranty != null) this.isFreeWarranty = isFreeWarranty;
        if (vatPercent != null) this.vatPercent = vatPercent;
        if (note != null) this.note = note;
        if (serialNumberId != null) this.serialNumberId = serialNumberId == -1 ? null : serialNumberId;
        if (serialNumberText != null) this.serialNumberText = serialNumberText.isEmpty() ? null : serialNumberText;
        if (replacementSerialNumberId != null) this.replacementSerialNumberId = replacementSerialNumberId == -1 ? null : replacementSerialNumberId;
        if (replacementSerialNumberText != null) this.replacementSerialNumberText = replacementSerialNumberText.isEmpty() ? null : replacementSerialNumberText;
    }
}
