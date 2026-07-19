package com.duylongtech.backend.service;

import com.duylongtech.backend.constant.RepairActionType;
import com.duylongtech.backend.constant.RepairStatus;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.InventoryDocumentLineRequest;
import com.duylongtech.backend.dto.request.InventoryDocumentRequest;
import com.duylongtech.backend.dto.request.RepairStatusUpdateRequest;
import com.duylongtech.backend.entity.Repair;
import com.duylongtech.backend.entity.RepairLine;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.RepairLineRepository;
import com.duylongtech.backend.repository.RepairRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RepairWorkflowService {

    private final RepairRepository repairRepository;
    private final RepairLineRepository repairLineRepository;
    private final AuditLogService auditLogService;
    private final InventoryDocumentService inventoryDocumentService;

    @Transactional
    public void updateStatus(Long repairId, RepairStatusUpdateRequest request, Long userId) {
        Repair repair = repairRepository.findById(repairId)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));

        String oldStatus = repair.getRepairStatus();
        String newStatus = request.getStatus();

        if (oldStatus.equals(newStatus)) {
            return;
        }

        validateStateTransition(oldStatus, newStatus);

        if (RepairStatus.CONFIRMED.name().equals(newStatus)) {
            handleConfirmTransition(repair, userId);
        } else if (RepairStatus.DONE.name().equals(newStatus)) {
            handleDoneTransition(repair, userId);
        }

        repair.setRepairStatus(newStatus);
        
        if (RepairStatus.DONE.name().equals(newStatus)) {
            repair.setCompletedDate(LocalDate.now());
        }

        repairRepository.save(repair);

        auditLogService.logAction(
                "REPAIR",
                repair.getId(),
                "UPDATE_STATUS",
                "Chuyển trạng thái từ " + oldStatus + " sang " + newStatus,
                userId
        );
    }

    private void validateStateTransition(String oldStatus, String newStatus) {
        // Implement state machine validation logic here if needed
    }

    private void handleConfirmTransition(Repair repair, Long userId) {
        List<RepairLine> lines = repairLineRepository.findByRepairId(repair.getId());
        List<RepairLine> addLines = lines.stream()
                .filter(l -> RepairActionType.ADD.name().equals(l.getActionType()))
                .collect(Collectors.toList());

        if (addLines.isEmpty()) {
            return; // No parts to reserve
        }

        // Hard Block check happens inside InventoryDocumentService (INV04 / INV05)
        // Here we attempt to generate a reservation document
        
        List<InventoryDocumentLineRequest> docLines = addLines.stream().map(l -> {
            InventoryDocumentLineRequest docLine = new InventoryDocumentLineRequest();
            docLine.setVariantId(l.getComponentVariantId());
            docLine.setQuantityOut(l.getQuantity());
            docLine.setUnitCost(l.getUnitPrice());
            return docLine;
        }).collect(Collectors.toList());

        InventoryDocumentRequest docRequest = new InventoryDocumentRequest();
        docRequest.setReferenceType("REPAIR");
        docRequest.setReferenceId(repair.getId());
        docRequest.setIssuePurpose("Xuất linh kiện sửa chữa cho lệnh " + repair.getRepairCode());
        docRequest.setLines(docLines);
        docRequest.setWarehouseId(1L); // Default warehouse 1
        docRequest.setDocDate(LocalDate.now());
        docRequest.setStatus("DRAFT");
        docRequest.setCreatedBy(userId);

        inventoryDocumentService.createExport(docRequest);
    }

    private void handleDoneTransition(Repair repair, Long userId) {
        // Find existing Draft OUT document and mark as DONE to physically deduct stock
        // Note: For now, we omit automatically posting draft out doc without ID. We rely on warehouse staff to post it.

        // Handle REMOVE lines (Scrap)
        List<RepairLine> lines = repairLineRepository.findByRepairId(repair.getId());
        List<RepairLine> removeLines = lines.stream()
                .filter(l -> RepairActionType.REMOVE.name().equals(l.getActionType()))
                .collect(Collectors.toList());

        if (!removeLines.isEmpty()) {
            List<InventoryDocumentLineRequest> scrapLines = removeLines.stream().map(l -> {
                InventoryDocumentLineRequest docLine = new InventoryDocumentLineRequest();
                docLine.setVariantId(l.getComponentVariantId());
                docLine.setQuantityIn(l.getQuantity());
                docLine.setUnitCost(java.math.BigDecimal.ZERO);
                return docLine;
            }).collect(Collectors.toList());

            InventoryDocumentRequest scrapRequest = new InventoryDocumentRequest();
            scrapRequest.setReferenceType("REPAIR_SCRAP");
            scrapRequest.setReferenceId(repair.getId());
            scrapRequest.setIssuePurpose("Nhập linh kiện thu hồi từ lệnh " + repair.getRepairCode());
            scrapRequest.setLines(scrapLines);
            scrapRequest.setWarehouseId(1L); // Default warehouse 1
            scrapRequest.setDocDate(LocalDate.now());
            scrapRequest.setStatus("DRAFT");
            scrapRequest.setCreatedBy(userId);

            inventoryDocumentService.createImport(scrapRequest);
        }

        // Generate Invoice
        if (!"none".equalsIgnoreCase(repair.getInvoiceMethod()) && repair.getTotalAmount().compareTo(java.math.BigDecimal.ZERO) > 0) {
            // Trigger InvoiceService here (if exists)
        }
    }
}
