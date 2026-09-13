package com.duylongtech.backend.feature.inventory;

import com.duylongtech.backend.feature.inventory.InventoryDocumentRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRequest;
import com.duylongtech.backend.feature.inventory.DependencyCheckResponse;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.product.SerialNumber;

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
    void validateCommonRequiredFields(com.duylongtech.backend.feature.inventory.InventoryDocumentRequest req, String label, boolean exportDocument);
}


