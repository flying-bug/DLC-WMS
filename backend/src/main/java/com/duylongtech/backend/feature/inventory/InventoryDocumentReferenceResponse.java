package com.duylongtech.backend.feature.inventory;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class InventoryDocumentReferenceResponse {
    private Long id;
    private Long referenceDocId;
    private String referenceDocCode;
    private String referenceType;
    private LocalDateTime createdAt;
}
