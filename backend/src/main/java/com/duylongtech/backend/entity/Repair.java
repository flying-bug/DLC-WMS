package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

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

    @Column(name = "partner_id", nullable = false)
    private Long partnerId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "serial_number_id", nullable = true)
    private Long serialNumberId;

    @Column(name = "warranty_id", nullable = true)
    private Long warrantyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warranty_id", insertable = false, updatable = false)
    private Warranty warranty;

    @Column(name = "under_warranty", nullable = false)
    @Builder.Default
    private Boolean underWarranty = false;

    @Column(name = "repair_warranty_end_date")
    private LocalDate repairWarrantyEndDate;

    @Column(name = "invoice_method", nullable = false, length = 30)
    @Builder.Default
    private String invoiceMethod = "after_repair"; // 'none', 'b4repair', 'after_repair'

    @Column(name = "received_date", nullable = false)
    private LocalDate receivedDate;

    @Column(name = "expected_date")
    private LocalDate expectedDate;

    @Column(name = "completed_date")
    private LocalDate completedDate;

    @Column(name = "repair_status", nullable = false, length = 30)
    @Builder.Default
    private String repairStatus = "DRAFT";

    @Column(name = "issue_description", nullable = false, columnDefinition = "TEXT")
    private String issueDescription;

    @Column(name = "diagnosis_note", columnDefinition = "TEXT")
    private String diagnosisNote;

    @Column(name = "solution_description", columnDefinition = "TEXT")
    private String solutionDescription;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

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
}
