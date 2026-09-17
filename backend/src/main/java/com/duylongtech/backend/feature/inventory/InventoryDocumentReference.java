package com.duylongtech.backend.feature.inventory;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

/**
 * A document this InventoryDocument references in addition to its single
 * purchaseOrderId/salesOrderId/referenceId provenance (e.g. the document it
 * was reissued from after an unpost, or a manually attached invoice).
 */
@Entity
@Table(name = "INVENTORY_DOCUMENT_REFERENCES")
@Getter
@Setter
@NoArgsConstructor
public class InventoryDocumentReference {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_document_id", nullable = false)
    private InventoryDocument inventoryDocument;

    @Column(name = "reference_doc_id", nullable = false)
    private Long referenceDocId;

    @Column(name = "reference_type", nullable = false, length = 30)
    private String referenceType;

    @Column(name = "note", length = 255)
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
