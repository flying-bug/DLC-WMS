package com.duylongtech.backend.feature.repair;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity phí dịch vụ/nhân công trong Lệnh Sửa Chữa.
 * Ví dụ: Phí vệ sinh máy, Phí công thợ, Phí kiểm định.
 */
@Entity
@Table(name = "REPAIR_FEES")
@Getter
@Setter
@NoArgsConstructor
public class RepairFee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repair_id", nullable = false)
    private Repair repair;

    // Tên phí dịch vụ
    @Setter(AccessLevel.NONE)
    @Column(name = "fee_name", nullable = false, length = 255)
    private String feeName;

    // Số tiền phí (= 0 nếu is_free_warranty = TRUE)
    @Setter(AccessLevel.NONE)
    @Column(name = "fee_amount", nullable = false, precision = 15, scale = 4)
    private BigDecimal feeAmount = BigDecimal.ZERO;

    // Miễn phí do bảo hành
    @Setter(AccessLevel.NONE)
    @Column(name = "is_free_warranty", nullable = false)
    private Boolean isFreeWarranty = false;

    // Số lượng
    @Setter(AccessLevel.NONE)
    @Column(name = "quantity", precision = 15, scale = 4)
    private BigDecimal quantity = BigDecimal.ONE;

    // Đơn vị tính
    @Setter(AccessLevel.NONE)
    @Column(name = "unit_name")
    private String unitName;

    // Thuế suất GTGT (%)
    @Setter(AccessLevel.NONE)
    @Column(name = "vat_percent", precision = 5, scale = 2)
    private BigDecimal vatPercent = BigDecimal.ZERO;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void initFee(String feeName, BigDecimal feeAmount, BigDecimal quantity, String unitName, Boolean isFreeWarranty, BigDecimal vatPercent, String note) {
        this.feeName = feeName;
        this.feeAmount = isFreeWarranty ? BigDecimal.ZERO : (feeAmount != null ? feeAmount : BigDecimal.ZERO);
        this.quantity = quantity != null ? quantity : BigDecimal.ONE;
        this.unitName = unitName;
        this.isFreeWarranty = isFreeWarranty;
        this.vatPercent = vatPercent != null ? vatPercent : BigDecimal.ZERO;
        this.note = note;
    }

    public void applyWarrantyZeroPrice() {
        this.feeAmount = BigDecimal.ZERO;
        this.isFreeWarranty = true;
    }

    public void updateDetails(String feeName, BigDecimal feeAmount, BigDecimal quantity, String unitName, Boolean isFreeWarranty, BigDecimal vatPercent, String note) {
        if (feeName != null) this.feeName = feeName;
        if (feeAmount != null) this.feeAmount = feeAmount;
        if (quantity != null) this.quantity = quantity;
        if (unitName != null) this.unitName = unitName;
        if (isFreeWarranty != null) this.isFreeWarranty = isFreeWarranty;
        if (vatPercent != null) this.vatPercent = vatPercent;
        if (note != null) this.note = note;
    }
}
