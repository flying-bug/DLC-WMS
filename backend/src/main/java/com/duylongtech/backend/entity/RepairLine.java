package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity dòng linh kiện trong Lệnh Sửa Chữa.
 * action_type = ADD  -> linh kiện lấy từ kho, khi DONE sẽ xuất kho.
 * action_type = REMOVE -> linh kiện tháo ra, khi DONE sẽ nhập vào Kho Phế Liệu (Scrap).
 */
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
    @JoinColumn(name = "repair_id", nullable = false)
    private Repair repair;

    // Linh kiện (ProductVariant)
    @Column(name = "component_variant_id", nullable = false)
    private Long componentVariantId;

    // ADD = thêm mới từ kho, REMOVE = tháo ra vào Scrap
    @Column(name = "action_type", nullable = false, length = 20)
    private String actionType;

    @Column(name = "quantity", nullable = false, precision = 15, scale = 4)
    private BigDecimal quantity;

    // Đơn giá (= 0 nếu is_free_warranty = TRUE)
    @Column(name = "unit_price", nullable = false, precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal unitPrice = BigDecimal.ZERO;

    // Miễn phí do bảo hành
    @Column(name = "is_free_warranty", nullable = false)
    @Builder.Default
    private Boolean isFreeWarranty = false;

    // Serial của linh kiện (để truy vết)
    @Column(name = "serial_number_id")
    private Long serialNumberId;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
