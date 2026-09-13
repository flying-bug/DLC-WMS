package com.duylongtech.backend.feature.inventory;

import com.duylongtech.backend.feature.inventory.InventoryDocumentResponse;

public interface InventoryPostingService {
    InventoryDocumentResponse postExport(Long id);
    InventoryDocumentResponse postImport(Long id);
    InventoryDocumentResponse unpostImport(Long id, String reason, Long currentUserId);
    InventoryDocumentResponse unpostExport(Long id, String reason, Long currentUserId);
}