package com.duylongtech.backend.feature.inventory;

import org.springframework.context.ApplicationEvent;

public class InventoryDocumentPostedEvent extends ApplicationEvent {
    
    private final Long documentId;
    private final String referenceType;
    private final Long referenceId;

    public InventoryDocumentPostedEvent(Object source, Long documentId, String referenceType, Long referenceId) {
        super(source);
        this.documentId = documentId;
        this.referenceType = referenceType;
        this.referenceId = referenceId;
    }

    public Long getDocumentId() {
        return documentId;
    }

    public String getReferenceType() {
        return referenceType;
    }

    public Long getReferenceId() {
        return referenceId;
    }
}
