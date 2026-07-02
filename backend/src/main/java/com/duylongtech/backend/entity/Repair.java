package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

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

    @Column(name = "warranty_id")
    private Long warrantyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warranty_id", insertable = false, updatable = false)
    private Warranty warranty;

    @Column(name = "partner_id", nullable = false)
    private Long partnerId;

    @Column(name = "serial_number_id", nullable = false)
    private Long serialNumberId;

    @Column(name = "received_date", nullable = false)
    private LocalDate receivedDate;

    @Column(name = "expected_date")
    private LocalDate expectedDate;

    @Column(name = "completed_date")
    private LocalDate completedDate;

    @Column(name = "repair_status", nullable = false, length = 30)
    private String repairStatus;

    @Column(name = "issue_description", nullable = false, columnDefinition = "TEXT")
    private String issueDescription;

    @Column(name = "diagnosis_note", columnDefinition = "TEXT")
    private String diagnosisNote;

    @Column(name = "solution_description", columnDefinition = "TEXT")
    private String solutionDescription;

    @Column(name = "repair_cost", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal repairCost = BigDecimal.ZERO;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;
}
