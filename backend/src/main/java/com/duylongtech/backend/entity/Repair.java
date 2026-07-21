package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity cho Lệnh Sửa Chữa (Repair Order).
 * State Machine: DRAFT -> QUOTATION -> CONFIRMED -> UNDER_REPAIR -> DONE
 *                                                                  -> CANCELLED (từ bất kỳ trạng thái nào trừ DONE)
 * Áp dụng Optimistic Locking (@Version) theo yêu cầu Constitution.
 */
@Entity
@Table(name = "REPAIRS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Repair {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "repair_code", nullable = false, unique = true, length = 50)
    private String repairCode;

    // Liên kết khách hàng (bắt buộc trước khi CONFIRMED)
    @Column(name = "partner_id", nullable = false)
    private Long partnerId;

    // Sản phẩm/thiết bị đang sửa (bắt buộc)
    @Column(name = "product_id")
    private Long productId;

    // Kho thực hiện lệnh sửa chữa
    @Column(name = "warehouse_id")
    private Long warehouseId;

    // Serial của thiết bị đang sửa (nullable - thiết bị ngoài không có serial)
    @Column(name = "serial_number_id")
    private Long serialNumberId;

    // Liên kết warranty cũ (nullable - backward compatibility)
    @Column(name = "warranty_id")
    private Long warrantyId;

    // Ngày tiếp nhận
    @Column(name = "received_date", nullable = false)
    private LocalDate receivedDate;

    // Ngày dự kiến hoàn tất
    @Column(name = "expected_date")
    private LocalDate expectedDate;

    // Ngày hoàn tất thực tế
    @Column(name = "completed_date")
    private LocalDate completedDate;

    // Trạng thái state machine
    @Column(name = "repair_status", nullable = false, length = 30)
    private String repairStatus;

    // Mô tả lỗi
    @Column(name = "issue_description", columnDefinition = "TEXT")
    private String issueDescription;

    // Ghi chú chẩn đoán
    @Column(name = "diagnosis_note", columnDefinition = "TEXT")
    private String diagnosisNote;

    // Mô tả giải pháp
    @Column(name = "solution_description", columnDefinition = "TEXT")
    private String solutionDescription;

    // Có đang trong hạn bảo hành máy không
    @Column(name = "under_warranty", nullable = false)
    @Builder.Default
    private Boolean underWarranty = false;

    // Hạn bảo hành sau sửa chữa (nếu có)
    @Column(name = "repair_warranty_end_date")
    private LocalDate repairWarrantyEndDate;

    // Phương thức xuất hóa đơn
    @Column(name = "invoice_method", nullable = false, length = 30)
    @Builder.Default
    private String invoiceMethod = "after_repair";

    // Tổng chi phí (linh kiện + phí dịch vụ)
    @Column(name = "total_amount", nullable = false, precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    // Chi phí sửa chữa cũ (backward compat)
    @Column(name = "repair_cost", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal repairCost = BigDecimal.ZERO;

    // Ghi chú chung
    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "approved_by")
    private Long approvedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Optimistic Locking - bắt buộc theo Constitution để tránh Lost Update.
     */
    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Integer version = 0;

    // Quan hệ với REPAIR_LINES
    @OneToMany(mappedBy = "repair", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<RepairLine> lines = new ArrayList<>();

    // Quan hệ với REPAIR_FEES
    @OneToMany(mappedBy = "repair", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<RepairFee> fees = new ArrayList<>();

    // Lazy-load partner, warranty (optional read)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warranty_id", insertable = false, updatable = false)
    private Warranty warranty;
}
