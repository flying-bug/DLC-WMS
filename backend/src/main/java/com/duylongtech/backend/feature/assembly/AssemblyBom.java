package com.duylongtech.backend.feature.assembly;

import com.duylongtech.backend.enums.DocumentStatus;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import com.duylongtech.backend.feature.product.Product;

@Entity
@Table(name = "ASSEMBLY_BOMS")
@Getter
@NoArgsConstructor
public class AssemblyBom {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "bom_code", nullable = false, unique = true, length = 50)
    private String bomCode;

    @Column(name = "bom_name", nullable = false, length = 150)
    private String bomName;

    @Column(name = "version_no", nullable = false, precision = 5, scale = 2)
        private BigDecimal versionNo = BigDecimal.ONE;

    @Column(nullable = false, length = 30)
        private String status = DocumentStatus.DRAFT.name();

    @Column(name = "submitted_by")
    private Long submittedBy;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejected_by")
    private Long rejectedBy;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "assemblyBom", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AssemblyBomLine> lines = new ArrayList<>();

    public void initBom(Product product, String bomCode, String bomName, BigDecimal versionNo, Long submitterId) {
        this.product = product;
        this.bomCode = bomCode;
        this.bomName = bomName;
        this.versionNo = versionNo != null ? versionNo : BigDecimal.ONE;
        this.status = DocumentStatus.DRAFT.name();
        this.submittedBy = submitterId;
    }

    public void forceUpdateStatus(String status) {
        if (status != null) {
            this.status = status;
        }
    }

    public void updateDetails(Product product, String bomCode, String bomName, BigDecimal versionNo) {
        if (!DocumentStatus.DRAFT.name().equals(this.status) && !DocumentStatus.REJECTED.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ được sửa BOM khi ở trạng thái DRAFT hoặc REJECTED");
        }
        if (product != null) this.product = product;
        if (bomCode != null) this.bomCode = bomCode;
        if (bomName != null) this.bomName = bomName;
        if (versionNo != null) this.versionNo = versionNo;
    }

    public void submitForApproval(Long submitterId) {
        if (!DocumentStatus.DRAFT.name().equals(this.status) && !DocumentStatus.REJECTED.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ được trình duyệt BOM khi ở trạng thái DRAFT hoặc REJECTED");
        }
        this.status = DocumentStatus.PENDING_APPROVAL.name();
        this.submittedBy = submitterId;
        this.submittedAt = LocalDateTime.now();
    }

    public void approve(Long approverId) {
        if (!DocumentStatus.PENDING_APPROVAL.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ được duyệt BOM khi đang ở trạng thái PENDING_APPROVAL");
        }
        this.status = DocumentStatus.APPROVED.name();
        this.approvedBy = approverId;
        this.approvedAt = LocalDateTime.now();
    }

    public void reject(Long rejectorId, String reason) {
        if (!DocumentStatus.PENDING_APPROVAL.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ được từ chối BOM khi đang ở trạng thái PENDING_APPROVAL");
        }
        this.status = DocumentStatus.REJECTED.name();
        this.rejectedBy = rejectorId;
        this.rejectedAt = LocalDateTime.now();
        this.rejectionReason = reason;
    }

    public void addLine(AssemblyBomLine line) {
        line.setAssemblyBom(this);
        this.lines.add(line);
    }

    public void clearLines() {
        this.lines.clear();
    }
}
