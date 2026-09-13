package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.InventoryDocumentRequest;
import com.duylongtech.backend.dto.request.InventoryDocumentLineRequest;
import com.duylongtech.backend.dto.response.DependencyCheckResponse;
import com.duylongtech.backend.entity.InventoryDocument;
import com.duylongtech.backend.entity.SerialNumber;

import java.util.List;

public interface InventoryValidationService {

    void validateCreateRequest(InventoryDocumentRequest req);

    void validateCreateImportRequest(InventoryDocumentRequest req);

    void validateUpdateRequest(InventoryDocumentRequest req);

    void validateUpdateImportRequest(InventoryDocumentRequest req);

    void validateOrderLineQuantities(InventoryDocumentRequest req, Long excludeDocId);

    void validateExportInventoryBalance(Long warehouseId, Long salesOrderId, String referenceType, Long referenceId, List<InventoryDocumentLineRequest> lines);

    void ensureEditable(InventoryDocument doc);

    DependencyCheckResponse checkImportUnpostable(Long id);

    DependencyCheckResponse checkExportUnpostable(Long id);
    
    void ensureSerialNotInstalledInPc(SerialNumber snObj, InventoryDocument doc);
    void ensureSerialNotInstalledInPc(SerialNumber serial);
    void validateCommonRequiredFields(com.duylongtech.backend.dto.request.InventoryDocumentRequest req, String label, boolean exportDocument);
}


