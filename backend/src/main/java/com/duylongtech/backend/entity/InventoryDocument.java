package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "INVENTORY_DOCUMENTS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "doc_code", nullable = false, length = 50, unique = true)
    private String docCode;

    @Column(name = "doc_type", nullable = false, length = 30)
    private String docType;

    @Column(name = "issue_purpose", length = 30)
    private String issuePurpose;

    @Column(name = "reference_type", length = 30)
    private String referenceType;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "warehouse_id")
    private Long warehouseId;

    @Column(name = "source_warehouse_id")
    private Long sourceWarehouseId;

    @Column(name = "purchase_order_id")
    private Long purchaseOrderId;

    @Column(name = "sales_order_id")
    private Long salesOrderId;

    @Column(name = "partner_id")
    private Long partnerId;

    @Column(name = "doc_date")
    private LocalDate docDate;

    @Column(name = "posted_at")
    private LocalDateTime postedAt;

    @Column(name = "status", length = 30)
    private String status;

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

    @OneToMany(mappedBy = "inventoryDocument", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InventoryDocumentLine> lines = new ArrayList<>();

    @Column(name = "recipient_name", length = 150)
    private String recipientName;

    @Column(name = "recipient_address", columnDefinition = "TEXT")
    private String recipientAddress;

    @Column(name = "salesperson_id")
    private Long salespersonId;
}
