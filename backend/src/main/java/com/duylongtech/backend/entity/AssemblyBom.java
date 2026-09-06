package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ASSEMBLY_BOMS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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
    @Builder.Default
    private BigDecimal versionNo = BigDecimal.ONE;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "DRAFT";

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
    @Builder.Default
    private List<AssemblyBomLine> lines = new ArrayList<>();
}
