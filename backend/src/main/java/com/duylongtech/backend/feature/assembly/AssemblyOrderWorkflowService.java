package com.duylongtech.backend.feature.assembly;

import com.duylongtech.backend.enums.DocumentStatus;
import com.duylongtech.backend.enums.SettlementStatus;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentResponse;
import com.duylongtech.backend.feature.inventory.InventoryDocumentService;
import com.duylongtech.backend.feature.inventory.GenerateInventoryDocumentRequest;
import com.duylongtech.backend.feature.notification.AppNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/**
 * Assembly/disassembly order approval + cancellation workflow, plus the
 * inventory-document generation glue those transitions trigger. Split out of
 * the former AssemblyOrderService; depends on AssemblyOrderService only to
 * reuse its response mapping (toOrderResponse), mirroring how
 * RepairWorkflowService depends on RepairService.
 */
@Service
@RequiredArgsConstructor
public class AssemblyOrderWorkflowService {
    private static final String ASSEMBLY = "ASSEMBLY";

    private final AssemblyOrderService assemblyOrderService;
    private final AssemblyOrderRepository assemblyOrderRepository;
    private final InventoryDocumentRepository inventoryDocumentRepository;
    private final InventoryDocumentService inventoryDocumentService;
    private final AppNotificationService appNotificationService;

    @Transactional
    public AssemblyOrderResponse submitOrder(Long id, Long actorId) {
        AssemblyOrder order = findOrderOrThrow(id);
        requireState(order.getStatus(), DocumentStatus.DRAFT.name(), DocumentStatus.REJECTED.name());
        order.submitForApproval(actorId);
        notifyRole("ROLE_ACCOUNTANT", "Lệnh chờ duyệt: " + order.getOrderCode(),
                "Kỹ thuật viên đã gửi lệnh " + order.getOrderCode() + " để duyệt.", "ASSEMBLY_ORDER", order.getId(),
                "/assembly-orders/" + order.getId());
        return assemblyOrderService.toOrderResponse(assemblyOrderRepository.save(order));
    }

    @Transactional
    public AssemblyOrderResponse approveOrder(Long id, Long actorId) {
        AssemblyOrder order = findOrderOrThrow(id);
        if (DocumentStatus.APPROVED.name().equals(order.getStatus())
                && inventoryDocumentRepository.existsByReferenceTypeAndReferenceIdAndDocType("ASSEMBLY_ORDER", id, "EX_SO")
                && inventoryDocumentRepository.existsByReferenceTypeAndReferenceIdAndDocType("ASSEMBLY_ORDER", id, "IN_PO")) {
            return assemblyOrderService.toOrderResponse(order);
        }
        requireState(order.getStatus(), DocumentStatus.PENDING_APPROVAL.name());
        if (!DocumentStatus.APPROVED.name().equals(order.getBom().getStatus())) {
            throw new BusinessException(SystemMessage.ASM_ERR_018.getMessage());
        }
        if (inventoryDocumentRepository.existsByReferenceTypeAndReferenceId("ASSEMBLY_ORDER", id)) {
            throw new BusinessException(SystemMessage.ASM_ERR_042.getMessage());
        }
        order.approve(actorId);
        assemblyOrderRepository.saveAndFlush(order);
        createDocumentPair(order);
        notifyRole("ROLE_WAREHOUSE_CONTROLLER", "Lệnh đã duyệt: " + order.getOrderCode(),
                "Cặp phiếu kho của lệnh " + order.getOrderCode() + " đã sẵn sàng.", "ASSEMBLY_ORDER", order.getId(),
                "/assembly-orders/" + order.getId());
        return assemblyOrderService.toOrderResponse(order);
    }

    @Transactional
    public AssemblyOrderResponse rejectOrder(Long id, Long actorId, String reason) {
        AssemblyOrder order = findOrderOrThrow(id);
        requireState(order.getStatus(), DocumentStatus.PENDING_APPROVAL.name());
        String normalizedReason = requireReason(reason);
        order.reject(actorId, normalizedReason);
        notifyUser(order.getCreatedBy(), "Lệnh bị từ chối: " + order.getOrderCode(), order.getRejectionReason(),
                "ASSEMBLY_ORDER", order.getId(), "/assembly-orders/" + order.getId());
        return assemblyOrderService.toOrderResponse(assemblyOrderRepository.save(order));
    }

    @Transactional
    public AssemblyOrderResponse requestCancel(Long id, Long actorId, String reason) {
        AssemblyOrder order = findOrderOrThrow(id);
        requireState(order.getStatus(), DocumentStatus.DRAFT.name(), DocumentStatus.REJECTED.name(),
                DocumentStatus.PENDING_APPROVAL.name(), DocumentStatus.APPROVED.name(), DocumentStatus.SUBMITTED.name());
        order.requestCancel(actorId, requireReason(reason));
        if (DocumentStatus.CANCELLED.name().equals(order.getStatus())) {
            notifyRole("ROLE_ACCOUNTANT", "Yêu cầu hủy: " + order.getOrderCode(),
                    order.getCancellationReason(), "ASSEMBLY_ORDER_CANCEL", order.getId(),
                    "/assembly-orders/" + order.getId());
        }
        return assemblyOrderService.toOrderResponse(assemblyOrderRepository.save(order));
    }

    @Transactional
    public AssemblyOrderResponse confirmCancel(Long id, Long actorId) {
        AssemblyOrder order = findOrderOrThrow(id);
        if (!SettlementStatus.PENDING.name().equals(order.getCancellationSettlementStatus())) {
            throw new BusinessException(SystemMessage.ASM_ERR_040.getMessage());
        }
        List<InventoryDocument> documents = inventoryDocumentRepository
                .findByReferenceWithLines("ASSEMBLY_ORDER", id);
        if (documents.stream().anyMatch(d -> "IN_PO".equals(d.getDocType()) && DocumentStatus.POSTED.name().equals(d.getStatus()))) {
            throw new BusinessException(SystemMessage.ASM_ERR_044.getMessage());
        }
        boolean exportPosted = documents.stream()
                .anyMatch(d -> "EX_SO".equals(d.getDocType()) && DocumentStatus.POSTED.name().equals(d.getStatus()));
        documents.stream().filter(d -> DocumentStatus.DRAFT.name().equals(d.getStatus())).forEach(d -> d.updateStatus(DocumentStatus.CANCELLED.name()));
        inventoryDocumentRepository.saveAll(documents);
        order.confirmCancel(actorId);
        return assemblyOrderService.toOrderResponse(assemblyOrderRepository.save(order));
    }

    @Transactional(readOnly = true)
    public List<InventoryDocumentResponse> getOrderDocuments(Long id) {
        findOrderOrThrow(id);
        return inventoryDocumentService.getAssemblyDocuments(id);
    }

    @Transactional
    public void generateInventoryDocument(Long id, GenerateInventoryDocumentRequest request, String actor) {
        AssemblyOrder order = findOrderOrThrow(id);
        if (!DocumentStatus.SUBMITTED.name().equals(order.getStatus()) && !DocumentStatus.APPROVED.name().equals(order.getStatus())) {
            throw new BusinessException(SystemMessage.ASM_ERR_033.getMessage());
        }

        InventoryDocumentRequest docReq = new InventoryDocumentRequest();
        docReq.setWarehouseId(order.getWarehouseId());
        docReq.setDocDate(LocalDate.now());
        docReq.setReferenceType("ASSEMBLY_ORDER");
        docReq.setReferenceId(order.getId());
        docReq.setIssuePurpose(order.getOrderType().equals(ASSEMBLY) ? "Lắp ráp" : "Tháo dỡ");
        docReq.setCreatedBy(order.getCreatedBy());
        docReq.setStatus(DocumentStatus.DRAFT.name());

        List<InventoryDocumentLineRequest> lines = request.getLines().stream().map(line -> {
            InventoryDocumentLineRequest lr = new InventoryDocumentLineRequest();
            lr.setVariantId(line.getVariantId());
            if ("GOODS_ISSUE".equals(request.getDocumentType())) {
                lr.setQuantityOut(line.getQuantity());
            } else {
                lr.setQuantityIn(line.getQuantity());
            }
            lr.setUnitCost(BigDecimal.ZERO);
            lr.setUnitPrice(BigDecimal.ZERO);
            lr.setSerialNumbers(line.getSerialNumbers());
            return lr;
        }).toList();
        docReq.setLines(lines);

        if ("GOODS_ISSUE".equals(request.getDocumentType())) {
            inventoryDocumentService.createExport(docReq);
        } else if ("GOODS_RECEIPT".equals(request.getDocumentType())) {
            inventoryDocumentService.createImport(docReq);
        } else {
            throw new BusinessException(SystemMessage.ASM_ERR_032.getMessage());
        }
    }

    private AssemblyOrder findOrderOrThrow(Long id) {
        if (id == null) {
            throw new BusinessException(SystemMessage.ASM_ERR_016.getMessage());
        }
        return assemblyOrderRepository.findByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy lệnh lắp ráp/tháo dỡ"));
    }

    private void createDocumentPair(AssemblyOrder order) {
        InventoryDocumentRequest export = baseDocument(order);
        InventoryDocumentRequest receipt = baseDocument(order);
        List<InventoryDocumentLineRequest> componentLines = order.getLines().stream()
                .map(line -> documentLine(line.getComponentVariant().getId(), line.getQuantityRequired()))
                .toList();
        List<InventoryDocumentLineRequest> targetLines =
                List.of(documentLine(order.getTargetVariant().getId(), order.getQuantity()));
        if (ASSEMBLY.equals(order.getOrderType())) {
            export.setLines(asExportLines(componentLines));
            receipt.setLines(asImportLines(targetLines));
        } else {
            export.setLines(asExportLines(targetLines));
            receipt.setLines(asImportLines(componentLines));
        }
        inventoryDocumentService.createExport(export);
        inventoryDocumentService.createImport(receipt);
    }

    private InventoryDocumentRequest baseDocument(AssemblyOrder order) {
        InventoryDocumentRequest request = new InventoryDocumentRequest();
        request.setIssuePurpose("ASSEMBLY");
        request.setReferenceType("ASSEMBLY_ORDER");
        request.setReferenceId(order.getId());
        request.setWarehouseId(order.getWarehouseId());
        request.setDocDate(LocalDate.now());
        request.setStatus(DocumentStatus.DRAFT.name());
        request.setCreatedBy(order.getCreatedBy());
        request.setNote("Tự động tạo từ lệnh " + order.getOrderCode());
        return request;
    }

    private InventoryDocumentLineRequest documentLine(Long variantId, BigDecimal quantity) {
        InventoryDocumentLineRequest line = new InventoryDocumentLineRequest();
        line.setVariantId(variantId);
        line.setWarehouseId(null);
        line.setUnitCost(BigDecimal.ZERO);
        line.setUnitPrice(BigDecimal.ZERO);
        line.setBaseQuantity(quantity);
        return line;
    }

    private List<InventoryDocumentLineRequest> asExportLines(List<InventoryDocumentLineRequest> lines) {
        lines.forEach(line -> line.setQuantityOut(line.getBaseQuantity()));
        return lines;
    }

    private List<InventoryDocumentLineRequest> asImportLines(List<InventoryDocumentLineRequest> lines) {
        lines.forEach(line -> line.setQuantityIn(line.getBaseQuantity()));
        return lines;
    }

    private void requireState(String actual, String... allowed) {
        if (!Set.of(allowed).contains(actual)) {
            throw new BusinessException(SystemMessage.ASM_ERR_040.getMessage());
        }
    }

    private String requireReason(String reason) {
        String normalized = trimToNull(reason);
        if (normalized == null) {
            throw new BusinessException(SystemMessage.ASM_ERR_041.getMessage());
        }
        return normalized;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void notifyRole(String role, String title, String message, String type, Long id, String link) {
        try {
            appNotificationService.createNotification(role, null, title, message, type, type, id, link);
        } catch (RuntimeException ignored) {
            // Notification failure must not roll back the workflow transaction.
        }
    }

    private void notifyUser(Long userId, String title, String message, String type, Long id, String link) {
        if (userId == null) {
            return;
        }
        try {
            appNotificationService.createNotification(null, userId, title, message, type, type, id, link);
        } catch (RuntimeException ignored) {
            // Notification failure must not roll back the workflow transaction.
        }
    }
}
