package com.duylongtech.backend.feature.repair;

import com.duylongtech.backend.enums.DocumentStatus;
import com.duylongtech.backend.enums.RepairStatus;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentPostedEvent;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.notification.AppNotificationService;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class InventoryDocumentPostedEventListenerTest {

    @Test
    void postedExportStartsRepairWithoutWaitingForDraftScrapImport() {
        RepairRepository repairRepository = mock(RepairRepository.class);
        InventoryDocumentRepository documentRepository = mock(InventoryDocumentRepository.class);
        RepairWorkflowService workflowService = mock(RepairWorkflowService.class);
        AppNotificationService notificationService = mock(AppNotificationService.class);
        InventoryDocumentPostedEventListener listener = new InventoryDocumentPostedEventListener(
                repairRepository, documentRepository, workflowService, notificationService);

        Repair repair = mock(Repair.class);
        when(repair.getRepairStatus()).thenReturn(RepairStatus.WAITING_FOR_EXPORT.name());
        when(repair.getRepairCode()).thenReturn("SC000063");
        when(repair.getId()).thenReturn(63L);
        when(repairRepository.findById(63L)).thenReturn(Optional.of(repair));

        InventoryDocument export = mock(InventoryDocument.class);
        when(export.getDocType()).thenReturn("EX_SO");
        when(export.getStatus()).thenReturn(DocumentStatus.POSTED.name());
        InventoryDocument scrapImport = mock(InventoryDocument.class);
        when(scrapImport.getDocType()).thenReturn("IN_PO");
        when(scrapImport.getStatus()).thenReturn(DocumentStatus.DRAFT.name());
        when(documentRepository.findByReferenceWithLines("REPAIR", 63L))
                .thenReturn(List.of(export, scrapImport));

        listener.handleInventoryDocumentPosted(
                new InventoryDocumentPostedEvent(this, 1L, "REPAIR", 63L));

        verify(workflowService).transitionStatus(
                63L, RepairStatus.UNDER_REPAIR.name(),
                "Tự động chuyển trạng thái vì kho đã xuất đủ linh kiện.");
    }
}
