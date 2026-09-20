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
import com.duylongtech.backend.feature.inventory.InventoryCostAllocationService;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLine;
import com.duylongtech.backend.feature.inventory.GenerateInventoryDocumentRequest;
import com.duylongtech.backend.feature.notification.AppNotificationService;
import com.duylongtech.backend.feature.auth.UserRepository;
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
    private final InventoryCostAllocationService inventoryCostAllocationService;
    private final AppNotificationService appNotificationService;
    private final UserRepository userRepository;
    private final com.duylongtech.backend.feature.warehouse.WarehouseRepository warehouseRepository;

    private String getUserName(Long userId) {
        if (userId == null) return "Hệ thống";
        return userRepository.findById(userId)
                .map(u -> u.getFullName() != null ? u.getFullName() : u.getUsername())
                .orElse("Người dùng " + userId);
    }

    @Transactional
    public AssemblyOrderResponse submitOrder(Long id, Long actorId) {
        AssemblyOrder order = findOrderOrThrow(id);
        requireState(order.getStatus(), DocumentStatus.DRAFT.name(), DocumentStatus.REJECTED.name());
        order.submitForApproval(actorId);
        String creatorName = getUserName(order.getCreatedBy());
        notifyRole("ROLE_ACCOUNTANT", "Lệnh chờ duyệt: " + order.getOrderCode(),
                "Kỹ thuật viên " + creatorName + " đã gửi lệnh " + order.getOrderCode() + " để duyệt.", "ASSEMBLY_ORDER", order.getId(),
                "/assembly-orders/" + order.getId());
        return assemblyOrderService.toOrderResponse(assemblyOrderRepository.save(order));
    }

    @Transactional
    public AssemblyOrderResponse approveOrder(Long id, Long actorId) {
        AssemblyOrder order = findOrderOrThrow(id);
        if (DocumentStatus.APPROVED.name().equals(order.getStatus())
                && inventoryDocumentRepository.existsByReferenceTypeAndReferenceIdAndDocType("ASSEMBLY_ORDER", id, "EX_SO")
                && inventoryDocumentRepository.existsByReferenceTypeAndReferenceIdAndDocType("ASSEMBLY_ORDER", id, "IN_PO")) {
            List<InventoryDocument> pair = inventoryDocumentRepository
                    .findByReferenceWithLines("ASSEMBLY_ORDER", order.getId());
            InventoryDocument exportDoc = pair.stream().filter(d -> "EX_SO".equals(d.getDocType())).findFirst().orElse(null);
            InventoryDocument importDoc = pair.stream().filter(d -> "IN_PO".equals(d.getDocType())).findFirst().orElse(null);
            if (exportDoc != null && importDoc != null && exportDoc.isPostable()
                    && !inventoryCostAllocationService.hasActiveAllocations(exportDoc)) {
                inventoryCostAllocationService.reserveDocument(exportDoc);
                synchronizeReservedCosts(order, exportDoc, importDoc);
            }
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
        InventoryDocumentResponse exportDoc = createDocumentPair(order);
        String approverName = getUserName(actorId);
        notifyRole("ROLE_WAREHOUSE_CONTROLLER", "Lệnh đã duyệt: " + order.getOrderCode(),
                "Cặp phiếu kho của lệnh " + order.getOrderCode() + " đã sẵn sàng.", "EXPORT_SLIP", exportDoc.getId(),
                "/export-slips/" + exportDoc.getId());
        notifyUser(order.getCreatedBy(), "Lệnh đã duyệt: " + order.getOrderCode(),
                "Kế toán " + approverName + " đã duyệt lệnh " + order.getOrderCode() + ".", "ASSEMBLY_ORDER", order.getId(),
                "/assembly-orders/" + order.getId());
        return assemblyOrderService.toOrderResponse(order);
    }

    @Transactional
    public AssemblyOrderResponse rejectOrder(Long id, Long actorId, String reason) {
        AssemblyOrder order = findOrderOrThrow(id);
        requireState(order.getStatus(), DocumentStatus.PENDING_APPROVAL.name());
        String normalizedReason = requireReason(reason);
        order.reject(actorId, normalizedReason);
        String rejectorName = getUserName(actorId);
        notifyUser(order.getCreatedBy(), "Lệnh bị từ chối: " + order.getOrderCode(), "Kế toán " + rejectorName + " đã từ chối: " + order.getRejectionReason(),
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
            cancelUnpostedDocuments(order.getId());
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
        if (exportPosted) {
            throw new BusinessException("Cần bỏ ghi sổ phiếu xuất trước khi xác nhận hủy lệnh");
        }
        documents.stream().filter(d -> "EX_SO".equals(d.getDocType()))
                .filter(d -> DocumentStatus.DRAFT.name().equals(d.getStatus())
                        || DocumentStatus.UNPOSTED.name().equals(d.getStatus()))
                .forEach(inventoryCostAllocationService::releaseDocument);
        documents.stream()
                .filter(d -> DocumentStatus.DRAFT.name().equals(d.getStatus())
                        || DocumentStatus.UNPOSTED.name().equals(d.getStatus()))
                .forEach(d -> d.updateStatus(DocumentStatus.CANCELLED.name()));
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
        findOrderOrThrow(id);
        throw new BusinessException("Phiếu xuất/nhập của lệnh được tự động tạo duy nhất khi duyệt lệnh");
    }

    private AssemblyOrder findOrderOrThrow(Long id) {
        if (id == null) {
            throw new BusinessException(SystemMessage.ASM_ERR_016.getMessage());
        }
        return assemblyOrderRepository.findByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy lệnh lắp ráp/tháo dỡ"));
    }

    private com.duylongtech.backend.feature.inventory.InventoryDocumentResponse createDocumentPair(AssemblyOrder order) {
        InventoryDocumentRequest export = baseDocument(order);
        InventoryDocumentRequest receipt = baseDocument(order);
        
        String technicianName = getUserName(order.getCreatedBy());
        export.setRecipientName(technicianName);
        receipt.setRecipientName(technicianName);
        
        List<InventoryDocumentLineRequest> componentLines = order.getLines().stream()
                .map(line -> documentLine(line.getComponentVariant().getId(), line.getQuantityRequired(), line.getUnitCost()))
                .toList();
        
        BigDecimal totalTargetCost = order.getLines().stream()
                .map(l -> (l.getUnitCost() != null ? l.getUnitCost() : BigDecimal.ZERO).multiply(l.getQuantityRequired()))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(order.getQuantity(), 4, java.math.RoundingMode.HALF_UP);

        List<InventoryDocumentLineRequest> targetLines =
                List.of(documentLine(order.getTargetVariant().getId(), order.getQuantity(), totalTargetCost));
        if (ASSEMBLY.equals(order.getOrderType())) {
            export.setLines(asExportLines(componentLines));
            export.setNote("Xuất linh kiện phục vụ lắp ráp lệnh " + order.getOrderCode());
            receipt.setLines(asImportLines(targetLines));
            receipt.setNote("Nhập thành phẩm từ lệnh lắp ráp " + order.getOrderCode());
        } else {
            export.setLines(asExportLines(targetLines));
            export.setNote("Xuất thành phẩm đi tháo dỡ theo lệnh " + order.getOrderCode());
            receipt.setLines(asImportLines(componentLines));
            receipt.setNote("Nhập linh kiện thu hồi từ lệnh " + order.getOrderCode());
            
            com.duylongtech.backend.feature.warehouse.Warehouse scrapWarehouse = warehouseRepository
                    .findFirstByTypeAndStatus("SCRAP", DocumentStatus.APPROVED.name())
                    .orElseThrow(() -> new BusinessException("Không tìm thấy kho phế liệu (SCRAP) đang hoạt động"));
            receipt.setWarehouseId(scrapWarehouse.getId());
        }
        InventoryDocumentResponse exportDoc = inventoryDocumentService.createExport(export);
        inventoryDocumentService.createImport(receipt);
        List<InventoryDocument> pair = inventoryDocumentRepository
                .findByReferenceWithLines("ASSEMBLY_ORDER", order.getId());
        InventoryDocument exportEntity = pair.stream().filter(d -> "EX_SO".equals(d.getDocType()))
                .findFirst().orElseThrow(() -> new BusinessException("Không tạo được phiếu xuất cho lệnh"));
        InventoryDocument importEntity = pair.stream().filter(d -> "IN_PO".equals(d.getDocType()))
                .findFirst().orElseThrow(() -> new BusinessException("Không tạo được phiếu nhập cho lệnh"));
        inventoryCostAllocationService.reserveDocument(exportEntity);
        synchronizeReservedCosts(order, exportEntity, importEntity);
        return exportDoc;
    }

    private void synchronizeReservedCosts(AssemblyOrder order, InventoryDocument exportDoc,
                                          InventoryDocument importDoc) {
        BigDecimal totalExportCost = exportDoc.getLines().stream()
                .map(line -> line.getUnitCost().multiply(baseQuantity(line)))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (ASSEMBLY.equals(order.getOrderType())) {
            for (AssemblyOrderLine orderLine : order.getLines()) {
                exportDoc.getLines().stream()
                        .filter(line -> line.getVariantId().equals(orderLine.getComponentVariant().getId()))
                        .findFirst().ifPresent(line -> orderLine.updateUnitCost(line.getUnitCost()));
            }
            for (InventoryDocumentLine line : importDoc.getLines()) {
                applyImportCost(line, totalExportCost.divide(baseQuantity(line), 4,
                        java.math.RoundingMode.HALF_UP));
            }
        } else {
            BigDecimal totalWeight = order.getLines().stream()
                    .map(line -> referenceWeight(line).multiply(line.getQuantityRequired()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            final BigDecimal denominator = totalWeight.compareTo(BigDecimal.ZERO) > 0
                    ? totalWeight
                    : order.getLines().stream().map(AssemblyOrderLine::getQuantityRequired)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
            for (InventoryDocumentLine line : importDoc.getLines()) {
                AssemblyOrderLine orderLine = order.getLines().stream()
                        .filter(candidate -> candidate.getComponentVariant().getId().equals(line.getVariantId()))
                        .findFirst().orElseThrow(() -> new BusinessException("Dòng nhập thu hồi không khớp BOM"));
                BigDecimal weight = referenceWeight(orderLine);
                BigDecimal allocatedValue = totalExportCost
                        .multiply(weight.multiply(orderLine.getQuantityRequired()))
                        .divide(denominator, 8, java.math.RoundingMode.HALF_UP);
                BigDecimal unitCost = allocatedValue.divide(baseQuantity(line), 4,
                        java.math.RoundingMode.HALF_UP);
                applyImportCost(line, unitCost);
                orderLine.updateUnitCost(unitCost);
            }
        }
        inventoryDocumentRepository.save(exportDoc);
        inventoryDocumentRepository.save(importDoc);
        assemblyOrderRepository.save(order);
    }

    private BigDecimal referenceWeight(AssemblyOrderLine line) {
        BigDecimal cost = line.getComponentVariant().getCostPrice();
        return cost != null && cost.compareTo(BigDecimal.ZERO) > 0 ? cost : BigDecimal.ONE;
    }

    private BigDecimal baseQuantity(InventoryDocumentLine line) {
        if (line.getBaseQuantity() != null && line.getBaseQuantity().compareTo(BigDecimal.ZERO) > 0) {
            return line.getBaseQuantity();
        }
        return line.getQuantityIn() != null && line.getQuantityIn().compareTo(BigDecimal.ZERO) > 0
                ? line.getQuantityIn() : line.getQuantityOut();
    }

    private void applyImportCost(InventoryDocumentLine line, BigDecimal unitCost) {
        line.setUnitCost(unitCost);
        line.setUnitPrice(unitCost);
        line.calculateImportAmounts();
    }

    private void cancelUnpostedDocuments(Long orderId) {
        List<InventoryDocument> documents = inventoryDocumentRepository
                .findByReferenceWithLines("ASSEMBLY_ORDER", orderId);
        documents.stream().filter(d -> "EX_SO".equals(d.getDocType()))
                .filter(d -> DocumentStatus.DRAFT.name().equals(d.getStatus())
                        || DocumentStatus.UNPOSTED.name().equals(d.getStatus()))
                .forEach(inventoryCostAllocationService::releaseDocument);
        documents.stream()
                .filter(d -> DocumentStatus.DRAFT.name().equals(d.getStatus())
                        || DocumentStatus.UNPOSTED.name().equals(d.getStatus()))
                .forEach(d -> d.updateStatus(DocumentStatus.CANCELLED.name()));
        inventoryDocumentRepository.saveAll(documents);
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
        return request;
    }

    private InventoryDocumentLineRequest documentLine(Long variantId, BigDecimal quantity, BigDecimal unitCost) {
        InventoryDocumentLineRequest line = new InventoryDocumentLineRequest();
        line.setVariantId(variantId);
        line.setWarehouseId(null);
        line.setUnitCost(unitCost != null ? unitCost : BigDecimal.ZERO);
        line.setUnitPrice(unitCost != null ? unitCost : BigDecimal.ZERO);
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
            appNotificationService.createNotification(role, null, title, message, type, type, id, link, null);
        } catch (RuntimeException ignored) {
            // Notification failure must not roll back the workflow transaction.
        }
    }

    private void notifyUser(Long userId, String title, String message, String type, Long id, String link) {
        if (userId == null) {
            return;
        }
        try {
            appNotificationService.createNotification(null, userId, title, message, type, type, id, link, null);
        } catch (RuntimeException ignored) {
            // Notification failure must not roll back the workflow transaction.
        }
    }
}
