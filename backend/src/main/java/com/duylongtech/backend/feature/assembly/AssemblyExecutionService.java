package com.duylongtech.backend.feature.assembly;

import com.duylongtech.backend.enums.DocumentStatus;
import com.duylongtech.backend.enums.SerialInstallStatus;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.SerialNumber;
import com.duylongtech.backend.feature.product.SerialNumberRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentService;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.repair.Repair;
import com.duylongtech.backend.feature.repair.RepairRepository;
import com.duylongtech.backend.feature.report.SerialTreeResponse;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Serial/device-component tracking plus the assembly & disassembly execution
 * engine. Split out of the former AssemblyOrderService. Kept as a single
 * service (rather than "serial tracking" + "execution" separately) because
 * buildDeviceSerialFromAssembly() and isDeviceSerialChangeHistory() are each
 * shared between saveSerials() and executeAssemblyOrder() - splitting further
 * would just recreate cross-file coupling.
 */
@Service
@RequiredArgsConstructor
public class AssemblyExecutionService {
    private static final String ASSEMBLY = "ASSEMBLY";
    private static final String DISASSEMBLY = "DISASSEMBLY";
    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final String COMPONENT_STATUS_ACTIVE = SerialInstallStatus.ACTIVE.name();

    private final AssemblyOrderRepository assemblyOrderRepository;
    private final AssemblyBomRepository assemblyBomRepository;
    private final AssemblyOrderSerialRepository assemblyOrderSerialRepository;
    private final DeviceComponentSerialRepository deviceComponentSerialRepository;
    private final ProductVariantRepository productVariantRepository;
    private final SerialNumberRepository serialNumberRepository;
    private final RepairRepository repairRepository;
    private final InventoryDocumentService inventoryDocumentService;
    private final InventoryDocumentRepository inventoryDocumentRepository;

    public List<AssemblyOrderSerialResponse> getSerials(Long orderId) {
        return assemblyOrderSerialRepository.findByAssemblyOrderId(orderId).stream()
                .filter(this::isOrderSerialMapping)
                .map(this::toSerialResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SerialTreeResponse getSerialTreeByTarget(Long serialNumberId, Long targetVariantId, String targetSerial) {
        String normalizedTargetSerial = trimToNull(targetSerial);
        Long resolvedTargetVariantId = targetVariantId;

        if (serialNumberId != null) {
            SerialNumber serial = serialNumberRepository.findById(serialNumberId)
                    .orElseThrow(() -> new BusinessException("Không tìm thấy serial thành phẩm"));
            normalizedTargetSerial = serial.getSerialNumber();
            resolvedTargetVariantId = serial.getVariantId();
        }

        if (normalizedTargetSerial == null) {
            throw new BusinessException(SystemMessage.ASM_ERR_007.getMessage());
        }

        List<DeviceComponentSerial> mappings = resolvedTargetVariantId != null
                ? deviceComponentSerialRepository.findByTargetVariantIdAndTargetSerial(resolvedTargetVariantId, normalizedTargetSerial)
                : deviceComponentSerialRepository.findByTargetSerial(normalizedTargetSerial);

        ProductVariant targetVariant = null;
        if (!mappings.isEmpty()) {
            targetVariant = mappings.get(0).getTargetVariant();
        } else if (resolvedTargetVariantId != null) {
            targetVariant = productVariantRepository.findById(resolvedTargetVariantId).orElse(null);
        }

        return SerialTreeResponse.builder()
                .targetSerial(normalizedTargetSerial)
                .targetSku(targetVariant != null ? targetVariant.getSku() : null)
                .targetName(targetVariant != null ? variantName(targetVariant) : null)
                .components(mappings.stream()
                        .filter(this::isActiveComponentSerial)
                        .map(this::toComponentSerialResponse)
                        .toList())
                .history(mappings.stream().map(this::toComponentSerialResponse).toList())
                .build();
    }

    @Transactional
    public void saveSerials(Long orderId, List<AssemblyOrderSerialRequest> requests) {
        AssemblyOrder order = assemblyOrderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found with id: " + orderId));

        boolean hasRepairHistory = deviceComponentSerialRepository.findBySourceAssemblyOrderId(orderId)
                .stream()
                .anyMatch(this::isDeviceSerialChangeHistory);
        if (hasRepairHistory) {
            throw new BusinessException(SystemMessage.ASM_ERR_006.getMessage());
        }

        assemblyOrderSerialRepository.deleteByAssemblyOrderId(orderId);
        deviceComponentSerialRepository.deleteBySourceAssemblyOrderId(orderId);

        if (requests == null || requests.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        List<AssemblyOrderSerial> newSerials = requests.stream().map(req -> {
            ProductVariant targetVar = productVariantRepository.findById(req.getTargetVariantId())
                    .orElseThrow(() -> new EntityNotFoundException("Target variant not found: " + req.getTargetVariantId()));
            ProductVariant compVar = productVariantRepository.findById(req.getComponentVariantId())
                    .orElseThrow(() -> new EntityNotFoundException("Component variant not found: " + req.getComponentVariantId()));

            AssemblyOrderSerial serial = new AssemblyOrderSerial();
            serial.initSerial(order, targetVar, req.getTargetSerial(), compVar, req.getComponentSerial(), order.getCreatedBy());
            if ("DISASSEMBLY".equals(order.getOrderType())) {
                serial.markAsRemoved(null, DISASSEMBLY.equals(order.getOrderType()) ? "Tháo dỡ từ lệnh " + order.getOrderCode() : null);
            }
            return serial;
        }).collect(Collectors.toList());

        assemblyOrderSerialRepository.saveAll(newSerials);

        List<DeviceComponentSerial> deviceSerials = requests.stream()
                .map(req -> buildDeviceSerialFromAssembly(order, req, order.getCreatedBy(), now))
                .collect(Collectors.toList());
        deviceComponentSerialRepository.saveAll(deviceSerials);
    }

    @Transactional
    public void executeAssemblyOrder(Long id, AssemblyExecutionRequest request, Long userId) {
        AssemblyOrder order = findOrderOrThrow(id);
        if (inventoryDocumentRepository.existsByReferenceTypeAndReferenceId("ASSEMBLY_ORDER", id)) {
            throw new BusinessException("Lệnh đã có cặp phiếu kho tự động; hãy thực hiện và ghi sổ trực tiếp trên các phiếu này");
        }
        if (!DocumentStatus.APPROVED.name().equals(order.getStatus())) {
            throw new BusinessException(SystemMessage.ASM_ERR_003.getMessage());
        }
        if (!ASSEMBLY.equals(order.getOrderType()) && !"DISASSEMBLY".equals(order.getOrderType())) {
            throw new BusinessException(SystemMessage.ASM_ERR_002.getMessage());
        }

        ProductVariant targetVariant = order.getTargetVariant();
        if (targetVariant == null) {
            throw new BusinessException(SystemMessage.ASM_ERR_001.getMessage());
        }

        java.util.Map<Long, BigDecimal> bomUnitPrices = buildBomUnitPriceMap(order);
        BigDecimal targetUnitPrice = calculateTargetUnitPrice(order);

        List<com.duylongtech.backend.feature.inventory.InventoryDocumentLineRequest> exportLines = new java.util.ArrayList<>();
        List<com.duylongtech.backend.feature.inventory.InventoryDocumentLineRequest> importLines = new java.util.ArrayList<>();
        List<AssemblyOrderSerialRequest> serialMappings = new java.util.ArrayList<>();

        java.util.Map<Long, java.util.List<String>> componentsToExport = new java.util.HashMap<>();

        for (AssemblyExecutionRequest.AssemblySetRequest set : request.getAssembledSets()) {
            com.duylongtech.backend.feature.inventory.InventoryDocumentLineRequest targetLine = new com.duylongtech.backend.feature.inventory.InventoryDocumentLineRequest();
            targetLine.setVariantId(targetVariant.getId());
            targetLine.setQuantityIn(BigDecimal.ONE);
            targetLine.setQuantityOut(BigDecimal.ONE); // Sets both, we will only use one based on the order type later
            targetLine.setUnitCost(targetUnitPrice);
            targetLine.setUnitPrice(targetUnitPrice);
            targetLine.setSerialNumbers(List.of(set.getParentSerial()));

            if (ASSEMBLY.equals(order.getOrderType())) {
                targetLine.setQuantityOut(null);
                importLines.add(targetLine);
            } else {
                targetLine.setQuantityIn(null);
                exportLines.add(targetLine);
            }

            for (AssemblyExecutionRequest.AssemblyComponentRequest comp : set.getComponents()) {
                componentsToExport.computeIfAbsent(comp.getVariantId(), k -> new java.util.ArrayList<>()).add(comp.getSerial());

                AssemblyOrderSerialRequest mapping = new AssemblyOrderSerialRequest();
                mapping.setTargetVariantId(targetVariant.getId());
                mapping.setTargetSerial(set.getParentSerial());
                mapping.setComponentVariantId(comp.getVariantId());
                mapping.setComponentSerial(comp.getSerial());
                serialMappings.add(mapping);
            }
        }

        for (java.util.Map.Entry<Long, java.util.List<String>> entry : componentsToExport.entrySet()) {
            com.duylongtech.backend.feature.inventory.InventoryDocumentLineRequest compLine = new com.duylongtech.backend.feature.inventory.InventoryDocumentLineRequest();
            compLine.setVariantId(entry.getKey());
            BigDecimal componentUnitPrice = bomUnitPrices.getOrDefault(entry.getKey(), ZERO);
            compLine.setUnitCost(componentUnitPrice);
            compLine.setUnitPrice(componentUnitPrice);
            compLine.setSerialNumbers(entry.getValue());

            if (ASSEMBLY.equals(order.getOrderType())) {
                compLine.setQuantityOut(new BigDecimal(entry.getValue().size()));
                exportLines.add(compLine);
            } else {
                compLine.setQuantityIn(new BigDecimal(entry.getValue().size()));
                importLines.add(compLine);
            }
        }

        com.duylongtech.backend.feature.inventory.InventoryDocumentRequest exportDoc = new com.duylongtech.backend.feature.inventory.InventoryDocumentRequest();
        exportDoc.setWarehouseId(request.getWarehouseId());
        exportDoc.setDocDate(request.getExecutionDate());
        exportDoc.setReferenceType("ASSEMBLY_ORDER");
        exportDoc.setReferenceId(order.getId());
        exportDoc.setIssuePurpose("ASSEMBLY"); // Xuất lắp ráp/tháo dỡ
        exportDoc.setCreatedBy(userId);
        exportDoc.setStatus(DocumentStatus.SUBMITTED.name());
        exportDoc.setLines(exportLines);
        com.duylongtech.backend.feature.inventory.InventoryDocumentResponse createdExport = inventoryDocumentService.createExport(exportDoc);
        inventoryDocumentService.postExport(createdExport.getId());

        com.duylongtech.backend.feature.inventory.InventoryDocumentRequest importDoc = new com.duylongtech.backend.feature.inventory.InventoryDocumentRequest();
        importDoc.setWarehouseId(request.getWarehouseId());
        importDoc.setDocDate(request.getExecutionDate());
        importDoc.setReferenceType("ASSEMBLY_ORDER");
        importDoc.setReferenceId(order.getId());
        importDoc.setIssuePurpose("PRODUCTION"); // Nhập kho sản xuất (thành phẩm sau lắp ráp)
        importDoc.setCreatedBy(userId);
        importDoc.setStatus(DocumentStatus.SUBMITTED.name());
        importDoc.setLines(importLines);
        com.duylongtech.backend.feature.inventory.InventoryDocumentResponse createdImport = inventoryDocumentService.createImport(importDoc);
        inventoryDocumentService.postImport(createdImport.getId());

        LocalDateTime now = LocalDateTime.now();
        List<AssemblyOrderSerial> newSerials = serialMappings.stream().map(req -> {
            ProductVariant targetVar = productVariantRepository.findById(req.getTargetVariantId())
                    .orElseThrow(() -> new EntityNotFoundException("Target variant not found: " + req.getTargetVariantId()));
            ProductVariant compVar = productVariantRepository.findById(req.getComponentVariantId())
                    .orElseThrow(() -> new EntityNotFoundException("Component variant not found: " + req.getComponentVariantId()));

            AssemblyOrderSerial serial = new AssemblyOrderSerial();
            serial.initSerial(order, targetVar, req.getTargetSerial(), compVar, req.getComponentSerial(), userId);
            if ("DISASSEMBLY".equals(order.getOrderType())) {
                serial.markAsRemoved(null, DISASSEMBLY.equals(order.getOrderType()) ? "Tháo dỡ từ lệnh " + order.getOrderCode() : null);
            }
            return serial;
        }).collect(Collectors.toList());

        assemblyOrderSerialRepository.saveAll(newSerials);
        if (ASSEMBLY.equals(order.getOrderType())) {
            List<DeviceComponentSerial> deviceSerials = serialMappings.stream()
                    .map(req -> buildDeviceSerialFromAssembly(order, req, userId, now))
                    .collect(Collectors.toList());
            deviceComponentSerialRepository.saveAll(deviceSerials);
        } else {
            updateDeviceComponentsForDisassembly(order, serialMappings, userId, now);
        }

        // ── Cập nhật quantityProduced ──────────────────────────────────────────
        int executedCount = request.getAssembledSets().size();
        BigDecimal newProduced = order.getQuantityProduced().add(new BigDecimal(executedCount));
        order.updateProducedQuantity(newProduced);

        // Nếu đã thực thi đủ toàn bộ → tự động chuyển SUBMITTED
        if (newProduced.compareTo(order.getQuantity()) >= 0) {
            order.markAsInProgress();
        }
        order.setUpdatedAt(LocalDateTime.now());
        assemblyOrderRepository.save(order);
    }

    private AssemblyOrder findOrderOrThrow(Long id) {
        if (id == null) {
            throw new BusinessException(SystemMessage.ASM_ERR_016.getMessage());
        }
        return assemblyOrderRepository.findByIdWithLines(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy lệnh lắp ráp/tháo dỡ"));
    }

    private DeviceComponentSerial buildDeviceSerialFromAssembly(AssemblyOrder order,
            AssemblyOrderSerialRequest req, Long userId, LocalDateTime now) {
        ProductVariant targetVar = productVariantRepository.findById(req.getTargetVariantId())
                .orElseThrow(() -> new EntityNotFoundException("Target variant not found: " + req.getTargetVariantId()));
        ProductVariant compVar = productVariantRepository.findById(req.getComponentVariantId())
                .orElseThrow(() -> new EntityNotFoundException("Component variant not found: " + req.getComponentVariantId()));
        String componentSerial = trimToNull(req.getComponentSerial());
        if (componentSerial == null) {
            throw new BusinessException(SystemMessage.ASM_ERR_005.getMessage());
        }

        if (ASSEMBLY.equals(order.getOrderType())
                && deviceComponentSerialRepository.existsActiveComponentSerial(compVar.getId(), componentSerial)) {
            throw new BusinessException(String.format(SystemMessage.ASM_ERR_004.getMessage(), componentSerial));
        }

        DeviceComponentSerial ds = new DeviceComponentSerial();
        if ("DISASSEMBLY".equals(order.getOrderType())) {
            ds.initDisassemblySerial(order, targetVar, req.getTargetSerial(), compVar, componentSerial, userId, DISASSEMBLY.equals(order.getOrderType()) ? "Tháo dỡ từ lệnh " + order.getOrderCode() : null);
        } else {
            ds.initSerial(order, targetVar, req.getTargetSerial(), compVar, componentSerial, userId);
        }
        return ds;
    }

    private java.util.Map<Long, BigDecimal> buildBomUnitPriceMap(AssemblyOrder order) {
        if (order.getBom() == null || order.getBom().getId() == null) {
            return java.util.Map.of();
        }

        AssemblyBom bom = assemblyBomRepository.findByIdWithLines(order.getBom().getId()).orElse(null);
        if (bom == null || bom.getLines() == null) {
            return java.util.Map.of();
        }

        return bom.getLines().stream()
                .filter(line -> line.getComponentVariant() != null && line.getComponentVariant().getId() != null)
                .collect(Collectors.toMap(
                        line -> line.getComponentVariant().getId(),
                        line -> line.getUnitPrice() != null ? line.getUnitPrice() : ZERO,
                        (first, second) -> first));
    }

    private BigDecimal calculateTargetUnitPrice(AssemblyOrder order) {
        if (order.getBom() == null || order.getBom().getId() == null) {
            return ZERO;
        }

        AssemblyBom bom = assemblyBomRepository.findByIdWithLines(order.getBom().getId()).orElse(null);
        if (bom == null || bom.getLines() == null) {
            return ZERO;
        }

        return bom.getLines().stream()
                .map(line -> {
                    BigDecimal unitPrice = line.getUnitPrice() != null ? line.getUnitPrice() : ZERO;
                    BigDecimal quantity = line.getQuantity() != null ? line.getQuantity() : BigDecimal.ONE;
                    return unitPrice.multiply(quantity);
                })
                .reduce(ZERO, BigDecimal::add);
    }

    private void updateDeviceComponentsForDisassembly(AssemblyOrder order,
            List<AssemblyOrderSerialRequest> serialMappings, Long userId, LocalDateTime now) {
        if (serialMappings == null || serialMappings.isEmpty()) {
            return;
        }

        java.util.Map<String, List<AssemblyOrderSerialRequest>> groupedByTargetSerial = serialMappings.stream()
                .filter(req -> trimToNull(req.getTargetSerial()) != null)
                .collect(Collectors.groupingBy(req -> req.getTargetSerial().trim()));
        List<DeviceComponentSerial> changedMappings = new java.util.ArrayList<>();

        for (java.util.Map.Entry<String, List<AssemblyOrderSerialRequest>> entry : groupedByTargetSerial.entrySet()) {
            String targetSerial = entry.getKey();
            List<DeviceComponentSerial> currentMappings = new java.util.ArrayList<>(
                    deviceComponentSerialRepository.findByTargetVariantIdAndTargetSerial(
                            order.getTargetVariant().getId(), targetSerial));
            AssemblyOrder sourceOrder = currentMappings.stream()
                    .map(DeviceComponentSerial::getSourceAssemblyOrder)
                    .filter(java.util.Objects::nonNull)
                    .findFirst()
                    .orElse(null);
            ProductVariant targetVariant = currentMappings.stream()
                    .map(DeviceComponentSerial::getTargetVariant)
                    .filter(java.util.Objects::nonNull)
                    .findFirst()
                    .orElse(order.getTargetVariant());

            for (AssemblyOrderSerialRequest req : entry.getValue()) {
                String componentSerial = trimToNull(req.getComponentSerial());
                if (componentSerial == null) {
                    continue;
                }

                DeviceComponentSerial currentMapping = findActiveDeviceMapping(
                        currentMappings, req.getComponentVariantId(), componentSerial);
                if (currentMapping != null) {
                    currentMapping.markAsRemoved(null, order, appendNote(currentMapping.getNote(),
                            "Tháo dỡ từ lệnh " + order.getOrderCode()));
                    currentMapping.markAsReplaced(null);
                    changedMappings.add(currentMapping);
                    continue;
                }

                ProductVariant componentVariant = productVariantRepository.findById(req.getComponentVariantId())
                        .orElseThrow(() -> new EntityNotFoundException("Component variant not found: " + req.getComponentVariantId()));
                DeviceComponentSerial recoveredMapping = new DeviceComponentSerial();
                recoveredMapping.initDisassemblySerial(order, targetVariant, targetSerial, componentVariant, componentSerial, userId, "Thu hồi ngoài cấu hình hiện tại từ lệnh " + order.getOrderCode());
                currentMappings.add(recoveredMapping);
                changedMappings.add(recoveredMapping);
            }
        }

        if (!changedMappings.isEmpty()) {
            deviceComponentSerialRepository.saveAll(changedMappings);
        }
    }

    private DeviceComponentSerial findActiveDeviceMapping(List<DeviceComponentSerial> mappings,
            Long componentVariantId, String componentSerial) {
        String normalizedSerial = trimToNull(componentSerial);
        if (normalizedSerial == null) {
            return null;
        }

        DeviceComponentSerial sameVariant = mappings.stream()
                .filter(this::isActiveComponentSerial)
                .filter(mapping -> mapping.getComponentVariant() != null)
                .filter(mapping -> java.util.Objects.equals(mapping.getComponentVariant().getId(), componentVariantId))
                .filter(mapping -> normalizedSerial.equalsIgnoreCase(mapping.getComponentSerial()))
                .findFirst()
                .orElse(null);
        if (sameVariant != null) {
            return sameVariant;
        }

        return mappings.stream()
                .filter(this::isActiveComponentSerial)
                .filter(mapping -> normalizedSerial.equalsIgnoreCase(mapping.getComponentSerial()))
                .findFirst()
                .orElse(null);
    }

    private String appendNote(String currentNote, String appendedNote) {
        String normalizedAppend = trimToNull(appendedNote);
        if (normalizedAppend == null) {
            return currentNote;
        }
        String normalizedCurrent = trimToNull(currentNote);
        if (normalizedCurrent == null) {
            return normalizedAppend;
        }
        return normalizedCurrent + " | " + normalizedAppend;
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

    private boolean isOrderSerialMapping(AssemblyOrderSerial serial) {
        return serial.getSourceRepairId() == null;
    }

    private boolean isDeviceSerialChangeHistory(DeviceComponentSerial serial) {
        return serial.getSourceRepairId() != null
                || serial.getRemovedByRepairId() != null
                || serial.getRemovedByAssemblyOrder() != null
                || trimToNull(serial.getReplacedBySerial()) != null;
    }

    private AssemblyOrderSerialResponse toSerialResponse(DeviceComponentSerial serial) {
        AssemblyOrderSerialResponse res = new AssemblyOrderSerialResponse();
        res.setId(serial.getId());
        res.setAssemblyOrderId(serial.getSourceAssemblyOrder() != null ? serial.getSourceAssemblyOrder().getId() : null);
        res.setRemovedByAssemblyOrderId(serial.getRemovedByAssemblyOrder() != null ? serial.getRemovedByAssemblyOrder().getId() : null);
        res.setRemovedByAssemblyOrderCode(serial.getRemovedByAssemblyOrder() != null ? serial.getRemovedByAssemblyOrder().getOrderCode() : null);
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

    private SerialTreeResponse.ComponentSerial toComponentSerialResponse(DeviceComponentSerial mapping) {
        ProductVariant component = mapping.getComponentVariant();
        return SerialTreeResponse.ComponentSerial.builder()
                .componentSerial(mapping.getComponentSerial())
                .componentSku(component != null ? component.getSku() : null)
                .componentName(component != null ? variantName(component) : null)
                .status(mapping.getStatus())
                .installedAt(mapping.getInstalledAt())
                .removedAt(mapping.getRemovedAt())
                .removedByAssemblyOrderId(mapping.getRemovedByAssemblyOrder() != null ? mapping.getRemovedByAssemblyOrder().getId() : null)
                .removedByAssemblyOrderCode(mapping.getRemovedByAssemblyOrder() != null ? mapping.getRemovedByAssemblyOrder().getOrderCode() : null)
                .sourceRepairId(mapping.getSourceRepairId())
                .sourceRepairCode(resolveRepairCode(mapping.getSourceRepairId()))
                .removedByRepairId(mapping.getRemovedByRepairId())
                .removedByRepairCode(resolveRepairCode(mapping.getRemovedByRepairId()))
                .replacedBySerial(mapping.getReplacedBySerial())
                .note(mapping.getNote())
                .build();
    }

    private String resolveRepairCode(Long repairId) {
        if (repairId == null) return null;
        return repairRepository.findById(repairId)
                .map(Repair::getRepairCode)
                .orElse(null);
    }

    private boolean isActiveComponentSerial(DeviceComponentSerial mapping) {
        return mapping.getStatus() == null || COMPONENT_STATUS_ACTIVE.equalsIgnoreCase(mapping.getStatus());
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

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
