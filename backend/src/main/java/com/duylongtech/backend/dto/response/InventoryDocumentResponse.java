package com.duylongtech.backend.dto.response;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class InventoryDocumentResponse {
    private Long id;
    private String docCode;
    private String docType;
    private String issuePurpose;
    private String referenceType;
    private Long referenceId;
    private Long warehouseId;
    private Long sourceWarehouseId;
    private Long purchaseOrderId;
    private Long salesOrderId;
    private Long partnerId;
    private LocalDate docDate;
    private LocalDateTime postedAt;
    private String status;
    private String note;
    private Long createdBy;
    private Long approvedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<InventoryDocumentLineResponse> lines;
}
