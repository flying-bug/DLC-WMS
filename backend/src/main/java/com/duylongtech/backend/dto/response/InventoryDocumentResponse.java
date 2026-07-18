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
    private String referenceCode;
    private Long warehouseId;
    private Long sourceWarehouseId;
    private Long purchaseOrderId;
    private Long salesOrderId;
    private Long partnerId;
    private String partnerCode;
    private String partnerName;
    private LocalDate docDate;
    private LocalDateTime postedAt;
    private String status;
    private String note;
    private Long createdBy;
    private Long approvedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String recipientName;
    private String recipientAddress;
    private Long salespersonId;
    private String salespersonName;
    private List<InventoryDocumentLineResponse> lines;
}
