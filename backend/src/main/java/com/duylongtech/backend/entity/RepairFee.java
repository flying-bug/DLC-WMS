package com.duylongtech.backend.entity;

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
@AllArgsConstructor
@Builder
public class RepairFee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repair_id", nullable = false)
    private Repair repair;

    // Tên phí dịch vụ
    @Column(name = "fee_name", nullable = false, length = 255)
    private String feeName;

    // Số tiền phí (= 0 nếu is_free_warranty = TRUE)
    @Column(name = "fee_amount", nullable = false, precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal feeAmount = BigDecimal.ZERO;

    // Miễn phí do bảo hành
    @Column(name = "is_free_warranty", nullable = false)
    @Builder.Default
    private Boolean isFreeWarranty = false;

    // Số lượng
    @Column(name = "quantity", precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal quantity = BigDecimal.ONE;

    // Đơn vị tính
    @Column(name = "unit_name")
    private String unitName;

    // Thuế suất GTGT (%)
    @Column(name = "vat_percent", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal vatPercent = BigDecimal.ZERO;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
