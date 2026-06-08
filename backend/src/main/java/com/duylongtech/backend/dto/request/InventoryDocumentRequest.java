package com.duylongtech.backend.dto.request;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class InventoryDocumentRequest {
    private String docCode; // optional, system generates if null
    private Long warehouseId;
    private Long sourceWarehouseId;
    private Long purchaseOrderId;
    private Long salesOrderId;
    private Long partnerId;
    private LocalDate docDate;
    private String status;
    private String note;
    private Long createdBy;
    private List<InventoryDocumentLineRequest> lines;
}
