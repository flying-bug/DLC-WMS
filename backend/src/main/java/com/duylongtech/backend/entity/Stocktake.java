package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "STOCKTAKES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Stocktake {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "stocktake_code", nullable = false, length = 50, unique = true)
    private String stocktakeCode;

    @Column(name = "warehouse_id", nullable = false)
    private Long warehouseId;

    @Column(name = "purpose", length = 255)
    private String purpose;

    @Column(name = "stocktake_date")
    private LocalDate stocktakeDate;

    @Column(name = "conclusion", columnDefinition = "TEXT")
    private String conclusion;

    @Column(name = "status", length = 30)
    private String status;

    @Column(name = "reference_import_id")
    private Long referenceImportId;

    @Column(name = "reference_export_id")
    private Long referenceExportId;

    @Column(name = "created_by")
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder.Default
    @OneToMany(mappedBy = "stocktake", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StocktakeLine> lines = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "stocktake", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StocktakeParticipant> participants = new ArrayList<>();
}
