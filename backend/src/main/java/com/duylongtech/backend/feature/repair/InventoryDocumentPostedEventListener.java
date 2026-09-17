package com.duylongtech.backend.feature.repair;

import com.duylongtech.backend.enums.DocumentStatus;
import com.duylongtech.backend.enums.RepairStatus;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentPostedEvent;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.notification.AppNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class InventoryDocumentPostedEventListener {

    private final RepairRepository repairRepository;
    private final InventoryDocumentRepository inventoryDocumentRepository;
    private final RepairWorkflowService repairWorkflowService;
    private final AppNotificationService notificationService;

    @EventListener
    @Transactional
    public void handleInventoryDocumentPosted(InventoryDocumentPostedEvent event) {
        if (!"REPAIR".equalsIgnoreCase(event.getReferenceType()) || event.getReferenceId() == null) {
            return;
        }

        Long repairId = event.getReferenceId();
        Repair repair = repairRepository.findById(repairId).orElse(null);

        if (repair == null || !RepairStatus.CONFIRMED.name().equals(repair.getRepairStatus())) {
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
            repairWorkflowService.transitionStatus(repairId, RepairStatus.UNDER_REPAIR.name(), "Tự động chuyển trạng thái vì kho đã xuất đủ linh kiện.");
            
            notificationService.createNotification(
                    "ROLE_TECHNICIAN", repair.getCreatedBy(), "Bắt đầu sửa chữa",
                    "Kho đã xuất đủ linh kiện cho lệnh " + repair.getRepairCode() + ". Bạn có thể bắt đầu sửa chữa.",
                    "REPAIR_READY", "REPAIR", repair.getId(), "/repair/" + repair.getId()
            );
        }
    }
}
