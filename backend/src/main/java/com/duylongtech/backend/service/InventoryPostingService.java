package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.response.InventoryDocumentResponse;

public interface InventoryPostingService {
    InventoryDocumentResponse postExport(Long id);
    InventoryDocumentResponse postImport(Long id);
    InventoryDocumentResponse unpostImport(Long id, String reason, Long currentUserId);
    InventoryDocumentResponse unpostExport(Long id, String reason, Long currentUserId);
}