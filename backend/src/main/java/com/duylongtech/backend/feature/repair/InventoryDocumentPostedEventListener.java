package com.duylongtech.backend.feature.repair;

import com.duylongtech.backend.enums.DocumentStatus;
import com.duylongtech.backend.enums.RepairStatus;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentPostedEvent;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.notification.AppNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class InventoryDocumentPostedEventListener {

    private final RepairRepository repairRepository;
    private final InventoryDocumentRepository inventoryDocumentRepository;
    private final RepairWorkflowService repairWorkflowService;
    private final AppNotificationService notificationService;

    // AFTER_COMMIT: runs in its own transaction once the inventory-posting
    // transaction has already committed, so a failure here (e.g. the
    // notification call) can never roll back the stock posting itself.
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void handleInventoryDocumentPosted(InventoryDocumentPostedEvent event) {
        if (!"REPAIR".equalsIgnoreCase(event.getReferenceType()) || event.getReferenceId() == null) {
            return;
        }

        Long repairId = event.getReferenceId();
        Repair repair = repairRepository.findById(repairId).orElse(null);

        if (repair == null || !RepairStatus.WAITING_FOR_EXPORT.name().equals(repair.getRepairStatus())) {
            return;
        }

        // Check if all inventory documents linked to this repair are POSTED
        List<InventoryDocument> linkedDocs = inventoryDocumentRepository.findByReferenceWithLines(
                "REPAIR", repairId
        );

        boolean allPosted = true;
        for (InventoryDocument doc : linkedDocs) {
            if (!DocumentStatus.POSTED.name().equals(doc.getStatus()) && !DocumentStatus.CANCELLED.name().equals(doc.getStatus())) {
                allPosted = false;
                break;
            }
        }

        if (allPosted && !linkedDocs.isEmpty()) {
            log.info("[Repair {}] All linked inventory documents posted. Transitioning to UNDER_REPAIR.", repair.getRepairCode());
            try {
                repairWorkflowService.transitionStatus(repairId, RepairStatus.UNDER_REPAIR.name(), "Tự động chuyển trạng thái vì kho đã xuất đủ linh kiện.");

                notificationService.createNotification(
                        "ROLE_TECHNICIAN", repair.getCreatedBy(), "Bắt đầu sửa chữa",
                        "Kho đã xuất đủ linh kiện cho lệnh " + repair.getRepairCode() + ". Bạn có thể bắt đầu sửa chữa.",
                        "REPAIR_READY", "REPAIR", repair.getId(), "/repairs/" + repair.getId()
                );
            } catch (Exception e) {
                log.error("[Repair {}] Failed to auto-transition to UNDER_REPAIR after inventory posting", repair.getRepairCode(), e);
            }
        }
    }
}
