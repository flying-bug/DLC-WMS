package com.duylongtech.backend.feature.assembly;

import com.duylongtech.backend.enums.DocumentStatus;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLine;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.repair.Repair;
import com.duylongtech.backend.feature.repair.RepairRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Assembly/disassembly order CRUD + response mapping. See
 * AssemblyBomService for BOM management, AssemblyOrderWorkflowService for
 * approval/cancel workflow + document generation, and AssemblyExecutionService
 * for serial tracking + the execute-order engine (this class used to own all
 * four; it was split apart to keep each concern independently testable).
 */
@Service
@RequiredArgsConstructor
public class AssemblyOrderService {
    private static final String ASSEMBLY = "ASSEMBLY";
    private static final String DISASSEMBLY = "DISASSEMBLY";
    private static final String DEFAULT_STATUS = DocumentStatus.DRAFT.name();
    private static final Set<String> VALID_TYPES = Set.of(ASSEMBLY, DISASSEMBLY);
    private static final Set<String> VALID_STATUSES = Set.of(DocumentStatus.DRAFT.name(), DocumentStatus.SUBMITTED.name(), DocumentStatus.APPROVED.name(), DocumentStatus.POSTED.name(), DocumentStatus.CANCELLED.name());
    private static final Set<String> EDITABLE_STATUSES = Set.of(DocumentStatus.DRAFT.name(), DocumentStatus.APPROVED.name());
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final AssemblyBomService assemblyBomService;
    private final AssemblyOrderRepository assemblyOrderRepository;
    private final ProductVariantRepository productVariantRepository;
    private final InventoryDocumentRepository inventoryDocumentRepository;
    private final AssemblyOrderSerialRepository assemblyOrderSerialRepository;
    private final RepairRepository repairRepository;
    private final UserRepository userRepository;
    private final AssemblyOrderMapper assemblyOrderMapper;

    @Transactional(readOnly = true)
    public List<AssemblyOrderResponse> getAssemblyOrders(String keyword, String orderType, String status,
            Long warehouseId, LocalDate fromDate, LocalDate toDate) {
        String normalizedType = normalizeOptionalType(orderType);
        String normalizedStatus = normalizeOptionalStatus(status);
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new BusinessException(SystemMessage.ASM_ERR_038.getMessage());
        }
        return assemblyOrderRepository.search(trimToNull(keyword), normalizedType, normalizedStatus, warehouseId, fromDate, toDate)
                .stream()
                .map(this::toOrderResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AssemblyOrderResponse getAssemblyOrderById(Long id) {
        return toOrderResponse(findOrderOrThrow(id));
    }

    @Transactional
    public AssemblyOrderResponse createAssemblyOrder(AssemblyOrderRequest request) {
        return createOrder(request, ASSEMBLY);
    }

    @Transactional
    public AssemblyOrderResponse createDisassemblyOrder(AssemblyOrderRequest request) {
        return createOrder(request, DISASSEMBLY);
    }

    @Transactional
    public AssemblyOrderResponse updateAssemblyOrder(Long id, AssemblyOrderRequest request) {
        validateRequest(request, false);
        AssemblyOrder order = findOrderOrThrow(id);
        ensureEditable(order);

        AssemblyBom bom = assemblyBomService.getApprovedBomOrThrow(request.getBomId());
        String requestedCode = trimToNull(request.getOrderCode());
        if (requestedCode != null && !requestedCode.equals(order.getOrderCode())) {
            if (assemblyOrderRepository.existsByOrderCodeAndIdNot(requestedCode, id)) {
                throw new BusinessException(SystemMessage.ASM_ERR_013.getMessage());
            }
            order.updateDetails(requestedCode, bom, resolveTargetVariant(bom), request.getWarehouseId(), request.getQuantity(), request.getExecutionDate(), request.getNote());
        } else {
            order.updateDetails(null, bom, resolveTargetVariant(bom), request.getWarehouseId(), request.getQuantity(), request.getExecutionDate(), request.getNote());
        }
        order.setUpdatedAt(LocalDateTime.now());
        rebuildLines(order, bom, request);
        return toOrderResponse(assemblyOrderRepository.save(order));
    }

    @Transactional
    public AssemblyOrderResponse updateOrderStatus(Long id, String newStatus) {
        AssemblyOrder order = findOrderOrThrow(id);
        String status = normalizeStatus(newStatus, order.getStatus());

        if (DocumentStatus.CANCELLED.name().equals(status)) {
            if (inventoryDocumentRepository.existsByReferenceTypeAndReferenceId("ASSEMBLY_ORDER", id)) {
                throw new BusinessException(SystemMessage.ASM_HAS_POSTED_DOCS.getMessage());
            }
        }

        if (DocumentStatus.SUBMITTED.name().equals(status)) {
            List<InventoryDocument> exports = inventoryDocumentRepository.searchExports(null, null, null, null, null, null, "ASSEMBLY_ORDER", id, null, null);
            List<InventoryDocument> imports = inventoryDocumentRepository.searchImports(null, null, null, null, null, null, "ASSEMBLY_ORDER", id, null, null);

            boolean anyDraft = exports.stream().anyMatch(d -> DocumentStatus.DRAFT.name().equals(d.getStatus())) ||
                               imports.stream().anyMatch(d -> DocumentStatus.DRAFT.name().equals(d.getStatus()));

            if (anyDraft) {
                throw new BusinessException(SystemMessage.ASM_ERR_037.getMessage());
            }

            BigDecimal requiredComponents = order.getLines().stream()
                .map(AssemblyOrderLine::getQuantityRequired)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal requiredTarget = order.getQuantity();

            Set<Long> componentIds = order.getLines().stream()
                .map(l -> l.getComponentVariant().getId())
                .collect(java.util.stream.Collectors.toSet());
            Long targetId = order.getTargetVariant().getId();

            BigDecimal exportedComponents = exports.stream()
                .filter(d -> DocumentStatus.POSTED.name().equals(d.getStatus()))
                .flatMap(d -> d.getLines().stream())
                .filter(l -> l.getVariantId() != null && componentIds.contains(l.getVariantId()))
                .map(InventoryDocumentLine::getQuantityOut)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal exportedTarget = exports.stream()
                .filter(d -> DocumentStatus.POSTED.name().equals(d.getStatus()))
                .flatMap(d -> d.getLines().stream())
                .filter(l -> l.getVariantId() != null && targetId.equals(l.getVariantId()))
                .map(InventoryDocumentLine::getQuantityOut)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal importedComponents = imports.stream()
                .filter(d -> DocumentStatus.POSTED.name().equals(d.getStatus()))
                .flatMap(d -> d.getLines().stream())
                .filter(l -> l.getVariantId() != null && componentIds.contains(l.getVariantId()))
                .map(InventoryDocumentLine::getQuantityIn)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal importedTarget = imports.stream()
                .filter(d -> DocumentStatus.POSTED.name().equals(d.getStatus()))
                .flatMap(d -> d.getLines().stream())
                .filter(l -> l.getVariantId() != null && targetId.equals(l.getVariantId()))
                .map(InventoryDocumentLine::getQuantityIn)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            if (ASSEMBLY.equals(order.getOrderType())) {
                if (exportedComponents.compareTo(requiredComponents) < 0 || importedTarget.compareTo(requiredTarget) < 0) {
                    throw new BusinessException(SystemMessage.ASM_ERR_035.getMessage());
                }

                // Validate Serial Mapping if Target tracks serial
                if (order.getTargetVariant().getProduct().getTrackSerial()) {
                    List<AssemblyOrderSerial> serials = assemblyOrderSerialRepository.findByAssemblyOrderId(id);
                    Set<String> mappedTargetSerials = serials.stream()
                            .filter(this::isOrderSerialMapping)
                            .map(AssemblyOrderSerial::getTargetSerial)
                            .collect(Collectors.toSet());

                    // We expect the number of unique target serials mapped to be at least requiredTarget
                    if (mappedTargetSerials.size() < requiredTarget.intValue()) {
                        throw new BusinessException(SystemMessage.ASM_ERR_036.getMessage());
                    }

                    // Also check if component mapping is full?
                    // We can assume if the user mapped the target, they mapped the components, but we could be stricter.
                    // For now, checking the target serial count is a good start.
                }
            } else {
                if (exportedTarget.compareTo(requiredTarget) < 0 || importedComponents.compareTo(requiredComponents) < 0) {
                    throw new BusinessException(SystemMessage.ASM_ERR_035.getMessage());
                }
            }
        }

        // order.setStatus(status);
        order.setUpdatedAt(LocalDateTime.now());
        return toOrderResponse(assemblyOrderRepository.save(order));
    }

    @Transactional
    public AssemblyOrderResponse updateNote(Long id, AssemblyOrderRequest request) {
        AssemblyOrder order = findOrderOrThrow(id);
        if (DocumentStatus.SUBMITTED.name().equals(order.getStatus())) {
            throw new BusinessException(SystemMessage.ASM_ERR_034.getMessage());
        }
        order.setNote(request.getNote());
        order.setUpdatedAt(LocalDateTime.now());
        return toOrderResponse(assemblyOrderRepository.save(order));
    }

    private AssemblyOrderResponse createOrder(AssemblyOrderRequest request, String orderType) {
        validateRequest(request, true);
        AssemblyBom bom = assemblyBomService.getApprovedBomOrThrow(request.getBomId());

        // resolveCreateOrderCode() embeds System.currentTimeMillis() when no code was
        // requested, so on a rare collision (two concurrent creates in the same ms) a
        // fresh attempt gets a different code; retry a few times before giving up.
        org.springframework.dao.DataIntegrityViolationException lastConflict = null;
        for (int attempt = 0; attempt < 3; attempt++) {
            try {
                String orderCode = resolveCreateOrderCode(request.getOrderCode(), orderType);
                AssemblyOrder order = new AssemblyOrder();
                order.initOrder(orderCode, orderType, bom, resolveTargetVariant(bom), request.getWarehouseId(), request.getQuantity(), request.getExecutionDate(), request.getNote(), request.getCreatedBy());
                rebuildLines(order, bom, request);
                return toOrderResponse(assemblyOrderRepository.saveAndFlush(order));
            } catch (org.springframework.dao.DataIntegrityViolationException conflict) {
                lastConflict = conflict;
            }
        }
        throw lastConflict;
    }

    private void validateRequest(AssemblyOrderRequest request, boolean create) {
        if (request == null) {
            throw new BusinessException(SystemMessage.ASM_ERR_031.getMessage());
        }
        if (request.getBomId() == null) {
            throw new BusinessException(SystemMessage.ASM_ERR_030.getMessage());
        }
        if (request.getWarehouseId() == null) {
            throw new BusinessException(SystemMessage.ASM_ERR_029.getMessage());
        }
        if (request.getQuantity() == null || request.getQuantity().compareTo(ZERO) <= 0) {
            throw new BusinessException(SystemMessage.ASM_ERR_028.getMessage());
        }
        if (request.getExecutionDate() == null) {
            throw new BusinessException(SystemMessage.ASM_ERR_027.getMessage());
        }
        if (create && request.getCreatedBy() == null) {
            throw new BusinessException(SystemMessage.ASM_ERR_026.getMessage());
        }
    }

    private AssemblyOrder findOrderOrThrow(Long id) {
        if (id == null) {
            throw new BusinessException(SystemMessage.ASM_ERR_016.getMessage());
        }
        return assemblyOrderRepository.findByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy lệnh lắp ráp/tháo dỡ"));
    }

    private ProductVariant resolveTargetVariant(AssemblyBom bom) {
        Product product = bom.getProduct();
        if (product == null) {
            throw new BusinessException(SystemMessage.ASM_ERR_015.getMessage());
        }
        List<ProductVariant> variants = productVariantRepository.findByProductIdOrderByIdAsc(product.getId());
        if (variants.isEmpty()) {
            throw new BusinessException(SystemMessage.ASM_ERR_015.getMessage());
        }
        return variants.stream()
                .filter(variant -> Boolean.TRUE.equals(variant.getActive()))
                .findFirst()
                .orElse(variants.get(0));
    }

    private void rebuildLines(AssemblyOrder order, AssemblyBom bom, AssemblyOrderRequest request) {
        order.getLines().clear();
        BigDecimal orderQuantity = request.getQuantity();

        if (request.getLines() != null && !request.getLines().isEmpty()) {
            for (AssemblyOrderLineRequest lineReq : request.getLines()) {
                ProductVariant variant = productVariantRepository.findById(lineReq.getComponentVariantId())
                        .orElseThrow(() -> new BusinessException("Không tìm thấy SKU linh kiện " + lineReq.getComponentVariantId()));
                AssemblyOrderLine line = new AssemblyOrderLine();
                line.initLine(variant, lineReq.getQuantityRequired() != null ? lineReq.getQuantityRequired() : lineReq.getQuantityActual(), ZERO, lineReq.getNote());
                line.updateActualQuantity(lineReq.getQuantityActual() != null ? lineReq.getQuantityActual() : lineReq.getQuantityRequired());
                order.getLines().add(line);
            }
        } else {
            for (AssemblyBomLine bomLine : bom.getLines()) {
                BigDecimal required = bomLine.getQuantity().multiply(orderQuantity);
                AssemblyOrderLine line = new AssemblyOrderLine();
                line.initLine(bomLine.getComponentVariant(), required, ZERO, bomLine.getNote());
                line.updateActualQuantity(required);
                order.getLines().add(line);
            }
        }
    }

    private void ensureEditable(AssemblyOrder order) {
        String status = normalizeStatus(order.getStatus(), DEFAULT_STATUS);
        if (!EDITABLE_STATUSES.contains(status)) {
            throw new BusinessException(SystemMessage.ASM_ERR_014.getMessage());
        }
    }

    private String resolveCreateOrderCode(String requestedCode, String orderType) {
        String orderCode = trimToNull(requestedCode);
        if (orderCode == null) {
            orderCode = (ASSEMBLY.equals(orderType) ? "LR-" : "TD-") + System.currentTimeMillis();
        }
        if (assemblyOrderRepository.existsByOrderCode(orderCode)) {
            throw new BusinessException(SystemMessage.ASM_ERR_013.getMessage());
        }
        return orderCode;
    }

    private String normalizeOptionalType(String orderType) {
        String normalized = trimToNull(orderType);
        if (normalized == null) {
            return null;
        }
        normalized = normalized.toUpperCase(Locale.ROOT);
        if (!VALID_TYPES.contains(normalized)) {
            throw new BusinessException(SystemMessage.ASM_ERR_010.getMessage());
        }
        return normalized;
    }

    private String normalizeOptionalStatus(String status) {
        String normalized = trimToNull(status);
        return normalized == null ? null : normalizeStatus(normalized, null);
    }

    private String normalizeStatus(String status, String fallback) {
        String normalized = trimToNull(status);
        if (normalized == null) {
            normalized = fallback;
        }
        if (normalized == null) {
            return null;
        }
        normalized = normalized.toUpperCase(Locale.ROOT);
        if (!VALID_STATUSES.contains(normalized)) {
            throw new BusinessException(SystemMessage.ASM_ERR_008.getMessage());
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

    public AssemblyOrderResponse toOrderResponse(AssemblyOrder order) {
        AssemblyOrderResponse response = assemblyOrderMapper.toOrderResponse(order);
        ProductVariant target = order.getTargetVariant();

        if (response.getTargetName() == null) {
            response.setTargetName(variantName(target));
        }

        if (order.getCreatedBy() != null) {
            response.setCreatedByName(userRepository.findById(order.getCreatedBy())
                    .map(User::getFullName)
                    .orElse(String.valueOf(order.getCreatedBy())));
        }

        List<AssemblyOrderSerial> serials = assemblyOrderSerialRepository.findByAssemblyOrderId(order.getId());
        List<AssemblyOrderSerialResponse> mappedSerials = serials.stream()
                .filter(this::isOrderSerialMapping)
                .map(this::toSerialResponse)
                .toList();
        response.setMappedSerials(mappedSerials);
        response.setSerialChangeHistory(List.of());

        if (order.getLines() != null) {
            response.setLines(order.getLines().stream().map(this::toOrderLineResponse).toList());
        } else {
            response.setLines(List.of());
        }
        return response;
    }

    private AssemblyOrderLineResponse toOrderLineResponse(AssemblyOrderLine line) {
        AssemblyOrderLineResponse response = assemblyOrderMapper.toOrderLineResponse(line);
        ProductVariant variant = line.getComponentVariant();
        if (response.getComponentName() == null) {
            response.setComponentName(variantName(variant));
        }
        return response;
    }

    private String variantName(ProductVariant variant) {
        if (variant == null) {
            return null;
        }
        Product product = variant.getProduct();
        String prodName = product != null ? product.getProductName() : null;
        String varName = variant.getVariantName();

        if (prodName != null) {
            if (varName == null || varName.isEmpty() || prodName.equals(varName)) {
                return prodName;
            }
            return prodName + " - " + varName;
        }
        return varName;
    }

    private boolean isOrderSerialMapping(AssemblyOrderSerial serial) {
        return serial.getSourceRepairId() == null;
    }

    private AssemblyOrderSerialResponse toSerialResponse(AssemblyOrderSerial serial) {
        AssemblyOrderSerialResponse res = new AssemblyOrderSerialResponse();
        res.setId(serial.getId());
        res.setAssemblyOrderId(serial.getAssemblyOrder() != null ? serial.getAssemblyOrder().getId() : null);
        res.setTargetVariantId(serial.getTargetVariant() != null ? serial.getTargetVariant().getId() : null);
        res.setTargetSerial(serial.getTargetSerial());
        res.setComponentVariantId(serial.getComponentVariant() != null ? serial.getComponentVariant().getId() : null);
        res.setComponentName(variantName(serial.getComponentVariant()));
        res.setComponentSerial(serial.getComponentSerial());
        res.setStatus(serial.getStatus());
        res.setInstalledAt(serial.getInstalledAt());
        res.setRemovedAt(serial.getRemovedAt());
        res.setSourceRepairId(serial.getSourceRepairId());
        res.setSourceRepairCode(resolveRepairCode(serial.getSourceRepairId()));
        res.setRemovedByRepairId(serial.getRemovedByRepairId());
        res.setRemovedByRepairCode(resolveRepairCode(serial.getRemovedByRepairId()));
        res.setReplacedBySerial(serial.getReplacedBySerial());
        res.setNote(serial.getNote());
        return res;
    }

    private String resolveRepairCode(Long repairId) {
        if (repairId == null) return null;
        return repairRepository.findById(repairId)
                .map(Repair::getRepairCode)
                .orElse(null);
    }
}
