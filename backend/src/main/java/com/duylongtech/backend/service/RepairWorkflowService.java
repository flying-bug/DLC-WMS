package com.duylongtech.backend.service;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.response.RepairResponse;
import com.duylongtech.backend.entity.*;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.*;
import com.duylongtech.backend.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Service xử lý chuyển trạng thái (State Machine) của Lệnh Sửa Chữa.
 *
 * State Machine:
 *   DRAFT -> QUOTATION -> CONFIRMED -> UNDER_REPAIR -> DONE
 *   Bất kỳ trạng thái nào (trừ DONE) -> CANCELLED
 *
 * Tích hợp:
 *   - Hard Block khi kho thiếu linh kiện ADD trước khi CONFIRMED
 *   - Tạo phiếu xuất kho DRAFT (Reserve) khi CONFIRMED
 *   - Ghi sổ phiếu kho (Post) + sinh Invoice khi DONE
 *   - Sinh phiếu nhập kho Scrap cho linh kiện REMOVE khi DONE
 *   - Ghi Audit Log cho mọi thao tác đổi trạng thái
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RepairWorkflowService {

    // Kho phế liệu mặc định - ID có thể cấu hình hoặc lookup từ DB
    // Trong triển khai thực tế nên dùng cấu hình hoặc lookup warehouse by code "SCRAP"
    private static final String SCRAP_WAREHOUSE_CODE = "SCRAP";
    private static final String REPAIR_DOC_TYPE_EXPORT = "EX_SO"; // Xuất linh kiện để sửa
    private static final String REPAIR_DOC_TYPE_IMPORT = "IN_PO"; // Nhập linh kiện tháo ra (Scrap)
    private static final String ACTION_ADD = "ADD";
    private static final String ACTION_REPLACE = "REPLACE";
    private static final String ACTION_REMOVE = "REMOVE";
    private static final String COMPONENT_STATUS_ACTIVE = "ACTIVE";
    private static final String COMPONENT_STATUS_REPLACED = "REPLACED";
    private static final String COMPONENT_STATUS_REMOVED = "REMOVED";

    // Định nghĩa các bước chuyển trạng thái hợp lệ
    private static final Map<String, Set<String>> VALID_TRANSITIONS = Map.of(
            "DRAFT",       Set.of("QUOTATION", "CONFIRMED", "CANCELLED"),
            "QUOTATION",   Set.of("CONFIRMED", "DRAFT", "CANCELLED"),
            "CONFIRMED",   Set.of("UNDER_REPAIR", "QUOTATION", "CANCELLED"),
            "UNDER_REPAIR", Set.of("DONE", "QUOTATION", "CANCELLED"),
            "DONE",        Set.of(),      // Terminal state
            "CANCELLED",   Set.of()       // Terminal state
    );

    private final RepairRepository repairRepository;
    private final RepairLineRepository repairLineRepository;
    private final RepairFeeRepository repairFeeRepository;
    private final InventoryDocumentRepository inventoryDocumentRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final WarehouseRepository warehouseRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final RepairService repairService;
    private final ProductVariantRepository productVariantRepository;
    private final InventoryDocumentService inventoryDocumentService;
    private final SerialNumberRepository serialNumberRepository;
    private final DeviceComponentSerialRepository deviceComponentSerialRepository;

    /**
     * Chuyển trạng thái chính.
     * Mỗi bước có thể kích hoạt side-effects khác nhau.
     */
    @Transactional(rollbackFor = Exception.class)
    public RepairResponse transitionStatus(Long repairId, String targetStatus, String note) {
        // Load repair với pessimistic lock để tránh concurrent modifications
        Repair repair = repairRepository.findWithDetailsById(repairId)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));

        String currentStatus = repair.getRepairStatus();
        String normalizedTarget = targetStatus.trim().toUpperCase();

        // Validate transition
        Set<String> allowedNext = VALID_TRANSITIONS.getOrDefault(currentStatus, Set.of());
        if (!allowedNext.contains(normalizedTarget)) {
            throw new BusinessException(SystemMessage.REP_INVALID_STATUS_TRANSITION);
        }

        // Side-effects theo trạng thái đích
        switch (normalizedTarget) {
            case "CONFIRMED" -> handleConfirm(repair);
            case "DONE"      -> handleDone(repair);
            case "CANCELLED" -> handleCancel(repair);
            default          -> { /* QUOTATION, UNDER_REPAIR không cần side-effects đặc biệt */ }
        }

        // Cập nhật trạng thái
        String previousStatus = repair.getRepairStatus();
        repair.setRepairStatus(normalizedTarget);
        if ("DONE".equals(normalizedTarget)) {
            repair.setCompletedDate(LocalDate.now());
        }

        Repair saved = repairRepository.save(repair);

        // Audit log
        String username = getCurrentUsername();
        auditLogService.logEvent(
                username, "UPDATE", "Repair", repairId,
                "SUCCESS",
                String.format("Chuyển trạng thái lệnh %s: %s -> %s. %s",
                        repair.getRepairCode(), previousStatus, normalizedTarget,
                        note != null ? "Ghi chú: " + note : ""),
                null, null
        );

        return repairService.toDetailResponse(repairRepository.findWithDetailsById(saved.getId()).orElse(saved));
    }

    // =====================================================================
    // CONFIRMED: Kiểm tra tồn kho & tạo phiếu xuất kho Draft (Reserve)
    // =====================================================================

    private void handleConfirm(Repair repair) {
        // Hard Block 1: Phải có partner
        if (repair.getPartnerId() == null) {
            throw new BusinessException(SystemMessage.REP_PARTNER_REQUIRED);
        }

        List<RepairLine> addLines = getLinesForStockOut(repair.getId());

        if (addLines.isEmpty()) {
            // Không có linh kiện cần xuất -> chỉ phí dịch vụ, cho phép CONFIRM
            log.info("[Repair {}] Không có linh kiện ADD, bỏ qua kiểm tra tồn kho", repair.getRepairCode());
            return;
        }

        // Hard Block 2: Kiểm tra tồn kho cho từng linh kiện ADD
        // Ưu tiên warehouseId từ lệnh sửa chữa, nếu không có thì lấy warehouse mặc định
        Long warehouseId = resolveRepairWarehouseId(repair);

        for (RepairLine line : addLines) {
            InventoryBalance balance;
            Long stockSerialNumberId = resolveStockOutSerialNumberId(line);
            if (stockSerialNumberId != null) {
                balance = inventoryBalanceRepository.findByWarehouseVariantSerialForUpdate(
                        warehouseId, line.getComponentVariantId(), stockSerialNumberId, "GOOD").orElse(null);
            } else {
                balance = inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(
                        warehouseId, line.getComponentVariantId(), "GOOD").orElse(null);
            }

            BigDecimal available = balance != null
                    ? balance.getQuantityOnHand().subtract(balance.getQuantityReserved())
                    : BigDecimal.ZERO;

            if (available.compareTo(line.getQuantity()) < 0) {
                log.warn("[Repair {}] Không đủ tồn kho. Variant {}: cần {}, có {}",
                        repair.getRepairCode(), line.getComponentVariantId(),
                        line.getQuantity(), available);
                throw new BusinessException(SystemMessage.REP_INSUFFICIENT_INVENTORY);
            }
        }

        log.info("[Repair {}] Xác nhận lệnh sửa chữa thành công, tồn kho hợp lệ", repair.getRepairCode());
    }


    // =====================================================================
    // DONE: Ghi sổ phiếu kho + Sinh Scrap + (stub) Sinh Invoice
    // =====================================================================

    private void handleDone(Repair repair) {
        // 0. Validate serial cho linh kiện có quản lý serial.
        List<RepairLine> allAddLines = repairLineRepository.findByRepairIdAndActionType(repair.getId(), ACTION_ADD);
        List<RepairLine> replaceLines = repairLineRepository.findByRepairIdAndActionType(repair.getId(), ACTION_REPLACE);
        List<RepairLine> removeLines = repairLineRepository.findByRepairIdAndActionType(
                repair.getId(), ACTION_REMOVE);
        validateSerialPresenceForTrackedLines(allAddLines, ACTION_ADD);
        validateSerialPresenceForTrackedLines(replaceLines, ACTION_REPLACE);
        validateSerialPresenceForTrackedLines(removeLines, ACTION_REMOVE);

        // 1. Post phiếu xuất kho linh kiện ADD (nếu có)
        List<RepairLine> stockOutLines = new java.util.ArrayList<>(allAddLines);
        stockOutLines.addAll(replaceLines);
        if (!stockOutLines.isEmpty()) {
            createFinalInventoryDocuments(repair, stockOutLines);
        }

        // 2. Sinh phiếu nhập kho Scrap cho linh kiện REMOVE (nếu có)
        List<RepairLine> scrapLines = new java.util.ArrayList<>(removeLines);
        scrapLines.addAll(replaceLines);
        if (!scrapLines.isEmpty()) {
            createScrapDocument(repair, scrapLines);
        }

        // 3. Cập nhật cấu hình serial bên trong PC sau sửa chữa.
        updateDeviceComponentSerialLifecycle(repair, allAddLines, replaceLines, removeLines);

        // 4. Stub: Sinh Invoice nếu invoice_method != 'none'
        if (!"none".equals(repair.getInvoiceMethod()) && repair.getTotalAmount().compareTo(BigDecimal.ZERO) > 0) {
            log.info("[Repair {}] Invoice method: {} - Total: {}. Invoice generation stub (sẽ implement ở Phase 3)",
                    repair.getRepairCode(), repair.getInvoiceMethod(), repair.getTotalAmount());
            // TODO: Gọi InvoiceService khi implement module Invoicing
        }
    }

    /**
     * Tạo và POST trực tiếp phiếu xuất kho (trừ kho thực tế) cho các linh kiện ADD.
     */
    private void createFinalInventoryDocuments(Repair repair, List<RepairLine> addLines) {
        Long warehouseId = resolveRepairWarehouseId(repair);
        Long currentUserId = resolveCurrentUserId();
        String docCode = "REP-EX-" + repair.getRepairCode();

        if (inventoryDocumentRepository.existsByDocCode(docCode)) {
            log.warn("[Repair {}] Phiếu xuất kho {} đã tồn tại", repair.getRepairCode(), docCode);
            return;
        }

        InventoryDocument exportDoc = InventoryDocument.builder()
                .docCode(docCode)
                .docType(REPAIR_DOC_TYPE_EXPORT)
                .issuePurpose("REPAIR")
                .referenceType("REPAIR")
                .referenceId(repair.getId())
                .warehouseId(warehouseId)
                .partnerId(repair.getPartnerId())
                .docDate(LocalDate.now())
                .status("DRAFT") // Lưu tạm trước khi post
                .note("Phiếu xuất linh kiện sửa chữa - Lệnh " + repair.getRepairCode())
                .createdBy(currentUserId)
                .salespersonId(repair.getCreatedBy() != null ? repair.getCreatedBy() : currentUserId)
                .recipientName(repair.getResponsiblePerson())
                .build();

        for (RepairLine rLine : addLines) {
            BigDecimal actualDoneQty = rLine.getQuantity();
            
            if (actualDoneQty.compareTo(BigDecimal.ZERO) <= 0) continue;

            Long stockOutSerialNumberId = resolveStockOutSerialNumberId(rLine);
            String serialNumbersText = resolveStockOutSerialText(rLine);
            if (stockOutSerialNumberId != null) {
                serialNumbersText = serialNumberRepository.findById(stockOutSerialNumberId)
                        .map(SerialNumber::getSerialNumber)
                        .orElse(serialNumbersText);
            }

            InventoryDocumentLine docLine = InventoryDocumentLine.builder()
                    .inventoryDocument(exportDoc)
                    .variantId(rLine.getComponentVariantId())
                    .quantityIn(BigDecimal.ZERO)
                    .quantityOut(actualDoneQty)
                    .unitCost(BigDecimal.ZERO)
                    .unitPrice(rLine.getUnitPrice())
                    .lineAmount(rLine.getUnitPrice().multiply(actualDoneQty))
                    .serialNumberId(stockOutSerialNumberId)
                    .serialNumbersText(serialNumbersText)
                    .note((ACTION_REPLACE.equals(rLine.getActionType()) ? "Linh kiện thay thế: " : "Linh kiện sửa chữa: ")
                            + (rLine.getNote() != null ? rLine.getNote() : ""))
                    .build();
            exportDoc.getLines().add(docLine);
        }

        if (!exportDoc.getLines().isEmpty()) {
            InventoryDocument savedDoc = inventoryDocumentRepository.save(exportDoc);
            try {
                inventoryDocumentService.postExport(savedDoc.getId());
                log.info("[Repair {}] Đã tạo và POST phiếu xuất kho {} thành công qua InventoryDocumentService", repair.getRepairCode(), docCode);
            } catch (Exception e) {
                log.error("[Repair {}] Lỗi khi POST phiếu xuất kho {}: {}", repair.getRepairCode(), docCode, e.getMessage());
                throw new BusinessException(String.format(SystemMessage.REP_ERR_009.getMessage(), e.getMessage()));
            }
        }
    }

    /**
     * Tạo và POST phiếu nhập kho Scrap cho linh kiện bị tháo ra (REMOVE).
     */
    private void createScrapDocument(Repair repair, List<RepairLine> removeLines) {
        Long scrapWarehouseId = resolveScrapWarehouseId();
        if (scrapWarehouseId == null) {
            log.warn("[Repair {}] Không tìm thấy kho Scrap, bỏ qua nhập kho phế liệu", repair.getRepairCode());
            return;
        }

        Long currentUserId = resolveCurrentUserId();
        String scrapDocCode = "REP-SCRAP-" + repair.getRepairCode();

        // Tránh tạo trùng
        if (inventoryDocumentRepository.existsByDocCode(scrapDocCode)) {
            log.warn("[Repair {}] Phiếu Scrap {} đã tồn tại", repair.getRepairCode(), scrapDocCode);
            return;
        }

        InventoryDocument scrapDoc = InventoryDocument.builder()
                .docCode(scrapDocCode)
                .docType(REPAIR_DOC_TYPE_IMPORT)
                .issuePurpose("SCRAP")
                .referenceType("REPAIR")
                .referenceId(repair.getId())
                .warehouseId(scrapWarehouseId)
                .partnerId(repair.getPartnerId())
                .docDate(LocalDate.now())
                .status("DRAFT") // Lưu tạm trước khi post
                .note("Phiếu nhập kho phế liệu - Lệnh sửa chữa " + repair.getRepairCode())
                .createdBy(currentUserId)
                .salespersonId(repair.getCreatedBy() != null ? repair.getCreatedBy() : currentUserId)
                .recipientName(repair.getResponsiblePerson())
                .build();

        for (RepairLine line : removeLines) {
            String serialNumbersText = line.getSerialNumberText();
            if (line.getSerialNumberId() != null) {
                serialNumbersText = serialNumberRepository.findById(line.getSerialNumberId())
                        .map(SerialNumber::getSerialNumber)
                        .orElse(serialNumbersText);
            }

            InventoryDocumentLine scrapLine = InventoryDocumentLine.builder()
                    .inventoryDocument(scrapDoc)
                    .variantId(resolveRemovedComponentVariantId(line))
                    .quantityIn(line.getQuantity())
                    .quantityOut(BigDecimal.ZERO)
                    .unitCost(BigDecimal.ZERO) // Linh kiện tháo ra ghi nhận giá vốn = 0 (phế liệu)
                    .unitPrice(BigDecimal.ZERO)
                    .lineAmount(BigDecimal.ZERO)
                    .serialNumberId(line.getSerialNumberId())
                    .serialNumbersText(serialNumbersText)
                    .note("Linh kiện tháo ra từ lệnh sửa " + repair.getRepairCode())
                    .build();
            scrapDoc.getLines().add(scrapLine);
        }

        if (!scrapDoc.getLines().isEmpty()) {
            InventoryDocument savedDoc = inventoryDocumentRepository.save(scrapDoc);
            try {
                inventoryDocumentService.postImport(savedDoc.getId());
                log.info("[Repair {}] Đã tạo và POST phiếu Scrap {} thành công qua InventoryDocumentService", repair.getRepairCode(), scrapDocCode);
            } catch (Exception e) {
                log.error("[Repair {}] Lỗi khi POST phiếu Scrap {}: {}", repair.getRepairCode(), scrapDocCode, e.getMessage());
                throw new BusinessException(String.format(SystemMessage.REP_ERR_008.getMessage(), e.getMessage()));
            }
        }
    }

    // =====================================================================
    // CANCELLED
    // =====================================================================

    private void handleCancel(Repair repair) {
        if ("DONE".equals(repair.getRepairStatus())) {
            throw new BusinessException(SystemMessage.REP_CANNOT_CANCEL);
        }
        // Với luồng mới, không có phiếu DRAFT, không giữ chỗ -> Không cần rollback inventory
        log.info("[Repair {}] Hủy lệnh sửa chữa", repair.getRepairCode());
    }

    // =====================================================================
    // Utility helpers
    // =====================================================================

    /**
     * Giải quyết warehouse ID cho lệnh sửa chữa.
     * Trả về warehouseId lưu trên Repair nếu có, nếu không lấy kho mặc định (APPROVED, không phải SCRAP).
     */
    private Long resolveRepairWarehouseId(Repair repair) {
        if (repair != null && repair.getWarehouseId() != null) {
            return repair.getWarehouseId();
        }
        throw new BusinessException(SystemMessage.WH_NOT_FOUND);
    }

    /**
     * Tìm kho Scrap để nhập linh kiện tháo ra.
     * Warehouse có code = 'SCRAP' hoặc type = 'SCRAP'.
     */
    private Long resolveScrapWarehouseId() {
        return warehouseRepository.findAll().stream()
                .filter(w -> "SCRAP".equalsIgnoreCase(w.getCode())
                        || "SCRAP".equalsIgnoreCase(w.getType()))
                .findFirst()
                .map(Warehouse::getId)
                .orElse(null);
    }

    private Long resolveCurrentUserId() {
        String username = getCurrentUsername();
        return userRepository.findByUsername(username)
                .map(User::getId)
                .orElse(1L);
    }

    private String getCurrentUsername() {
        try {
            return SecurityContextHolder.getContext().getAuthentication().getName();
        } catch (Exception e) {
            return "system";
        }
    }

    private void validateSerialPresenceForTrackedLines(List<RepairLine> lines, String actionType) {
        for (RepairLine line : lines) {
            ProductVariant variant = productVariantRepository.findById(line.getComponentVariantId()).orElse(null);
            if (variant == null || !productTracksSerial(variant)) {
                continue;
            }

            boolean missingSerial = switch (actionType) {
                case ACTION_ADD -> line.getSerialNumberId() == null;
                case ACTION_REPLACE -> trimToNull(resolveLineSerial(line)) == null
                        || line.getReplacementSerialNumberId() == null;
                default -> trimToNull(resolveLineSerial(line)) == null;
            };
            if (missingSerial) {
                String variantName = variantName(variant);
                throw new BusinessException(
                        String.format(SystemMessage.REP_SERIAL_REQUIRED.getMessage(), variantName));
            }
        }
    }

    private void updateDeviceComponentSerialLifecycle(Repair repair, List<RepairLine> addLines,
            List<RepairLine> replaceLines, List<RepairLine> removeLines) {
        if (repair.getSerialNumberId() == null) {
            return;
        }

        SerialNumber targetSerialNumber = serialNumberRepository.findById(repair.getSerialNumberId()).orElse(null);
        if (targetSerialNumber == null || targetSerialNumber.getVariantId() == null
                || trimToNull(targetSerialNumber.getSerialNumber()) == null) {
            log.warn("[Repair {}] Không tìm thấy serial thành phẩm để cập nhật cấu hình linh kiện", repair.getRepairCode());
            return;
        }

        String targetSerial = targetSerialNumber.getSerialNumber().trim();
        Long targetVariantId = targetSerialNumber.getVariantId();
        List<DeviceComponentSerial> mappings = new java.util.ArrayList<>(
                deviceComponentSerialRepository.findByTargetVariantIdAndTargetSerial(targetVariantId, targetSerial));

        if (mappings.isEmpty()) {
            log.info("[Repair {}] Serial {} chưa có mapping lắp ráp, bỏ qua cập nhật cấu hình linh kiện",
                    repair.getRepairCode(), targetSerial);
            return;
        }

        AssemblyOrder sourceOrder = mappings.stream()
                .map(DeviceComponentSerial::getSourceAssemblyOrder)
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElse(null);
        ProductVariant targetVariant = mappings.stream()
                .map(DeviceComponentSerial::getTargetVariant)
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElseGet(() -> productVariantRepository.findById(targetVariantId).orElse(null));

        if (targetVariant == null) {
            log.warn("[Repair {}] Mapping serial {} thiếu SKU thành phẩm, bỏ qua cập nhật",
                    repair.getRepairCode(), targetSerial);
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        Long currentUserId = resolveCurrentUserId();
        java.util.List<RepairLine> serialAddLines = addLines.stream()
                .filter(line -> trimToNull(resolveLineSerial(line)) != null)
                .toList();
        java.util.List<RepairLine> serialReplaceLines = replaceLines.stream()
                .filter(line -> trimToNull(resolveLineSerial(line)) != null)
                .filter(line -> trimToNull(resolveReplacementLineSerial(line)) != null)
                .toList();
        java.util.List<RepairLine> serialRemoveLines = removeLines.stream()
                .filter(line -> trimToNull(resolveLineSerial(line)) != null)
                .toList();
        java.util.List<DeviceComponentSerial> changedMappings = new java.util.ArrayList<>();

        for (RepairLine replaceLine : serialReplaceLines) {
            String removedSerial = resolveLineSerial(replaceLine);
            String replacementSerial = resolveReplacementLineSerial(replaceLine);
            DeviceComponentSerial currentMapping = findActiveMapping(mappings, replaceLine.getComponentVariantId(), removedSerial);
            if (currentMapping == null) {
                throw new BusinessException(String.format(SystemMessage.REP_ERR_007.getMessage(), removedSerial, targetSerial));
            }
            if (findActiveMapping(mappings, replaceLine.getComponentVariantId(), replacementSerial) != null) {
                throw new BusinessException(String.format(SystemMessage.REP_ERR_006.getMessage(), replacementSerial, targetSerial));
            }

            currentMapping.setStatus(COMPONENT_STATUS_REPLACED);
            currentMapping.setReplacedBySerial(replacementSerial);
            markRemovedByRepair(currentMapping, repair, now);
            currentMapping.setNote(appendNote(currentMapping.getNote(),
                    "Thay thế bởi serial " + replacementSerial + " từ phiếu sửa " + repair.getRepairCode()));
            changedMappings.add(currentMapping);

            DeviceComponentSerial newMapping = buildActiveRepairMapping(
                    sourceOrder, targetVariant, targetSerial, replaceLine, replacementSerial, repair, now, currentUserId,
                    "Thay thế serial " + removedSerial + " từ phiếu sửa " + repair.getRepairCode());
            mappings.add(newMapping);
            changedMappings.add(newMapping);
        }

        for (RepairLine removeLine : serialRemoveLines) {
            String removedSerial = resolveLineSerial(removeLine);
            DeviceComponentSerial currentMapping = findActiveMapping(mappings, removeLine.getComponentVariantId(), removedSerial);
            if (currentMapping == null) {
                throw new BusinessException(String.format(SystemMessage.REP_ERR_007.getMessage(), removedSerial, targetSerial));
            }

            currentMapping.setStatus(COMPONENT_STATUS_REMOVED);
            currentMapping.setReplacedBySerial(null);
            markRemovedByRepair(currentMapping, repair, now);
            currentMapping.setNote(appendNote(currentMapping.getNote(),
                    "Loại bỏ từ phiếu sửa " + repair.getRepairCode()));
            changedMappings.add(currentMapping);
        }

        for (RepairLine addLine : serialAddLines) {
            String addedSerial = resolveLineSerial(addLine);
            if (findActiveMapping(mappings, addLine.getComponentVariantId(), addedSerial) != null) {
                throw new BusinessException(String.format(SystemMessage.REP_ERR_006.getMessage(), addedSerial, targetSerial));
            }

            DeviceComponentSerial newMapping = buildActiveRepairMapping(
                    sourceOrder, targetVariant, targetSerial, addLine, addedSerial, repair, now, currentUserId,
                    "Lắp thêm từ phiếu sửa " + repair.getRepairCode());
            mappings.add(newMapping);
            changedMappings.add(newMapping);
        }

        if (!changedMappings.isEmpty()) {
            deviceComponentSerialRepository.saveAll(changedMappings);
            log.info("[Repair {}] Đã cập nhật {} dòng mapping serial cho PC {}",
                    repair.getRepairCode(), changedMappings.size(), targetSerial);
        }
    }

    private DeviceComponentSerial findActiveMapping(List<DeviceComponentSerial> mappings, Long componentVariantId, String componentSerial) {
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

    private DeviceComponentSerial buildActiveRepairMapping(AssemblyOrder sourceOrder, ProductVariant targetVariant,
            String targetSerial,
            RepairLine line, String componentSerial, Repair repair, LocalDateTime now, Long currentUserId, String note) {
        ProductVariant componentVariant = productVariantRepository.findById(line.getComponentVariantId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy linh kiện " + line.getComponentVariantId()));

        return DeviceComponentSerial.builder()
                .sourceAssemblyOrder(sourceOrder)
                .targetVariant(targetVariant)
                .targetSerial(targetSerial)
                .componentVariant(componentVariant)
                .componentSerial(componentSerial.trim())
                .status(COMPONENT_STATUS_ACTIVE)
                .installedAt(now)
                .sourceRepairId(repair.getId())
                .note(appendNote(note, trimToNull(line.getNote())))
                .createdBy(currentUserId)
                .build();
    }

    private void markRemovedByRepair(DeviceComponentSerial mapping, Repair repair, LocalDateTime removedAt) {
        mapping.setRemovedAt(removedAt);
        mapping.setRemovedByRepairId(repair.getId());
    }

    private List<RepairLine> getLinesForStockOut(Long repairId) {
        java.util.List<RepairLine> lines = new java.util.ArrayList<>(
                repairLineRepository.findByRepairIdAndActionType(repairId, ACTION_ADD));
        lines.addAll(repairLineRepository.findByRepairIdAndActionType(repairId, ACTION_REPLACE));
        return lines;
    }

    private Long resolveStockOutSerialNumberId(RepairLine line) {
        if (line == null) {
            return null;
        }
        return ACTION_REPLACE.equals(line.getActionType())
                ? line.getReplacementSerialNumberId()
                : line.getSerialNumberId();
    }

    private String resolveStockOutSerialText(RepairLine line) {
        if (line == null) {
            return null;
        }
        return ACTION_REPLACE.equals(line.getActionType())
                ? line.getReplacementSerialNumberText()
                : line.getSerialNumberText();
    }

    private Long resolveRemovedComponentVariantId(RepairLine line) {
        if (line == null) {
            return null;
        }
        if (line.getSerialNumberId() != null) {
            return serialNumberRepository.findById(line.getSerialNumberId())
                    .map(SerialNumber::getVariantId)
                    .orElse(line.getComponentVariantId());
        }
        String removedSerial = trimToNull(line.getSerialNumberText());
        if (removedSerial != null) {
            List<SerialNumber> serials = serialNumberRepository.findBySerialNumber(removedSerial);
            if (serials.size() == 1) {
                return serials.get(0).getVariantId();
            }
        }
        return line.getComponentVariantId();
    }

    private boolean isActiveComponentSerial(DeviceComponentSerial mapping) {
        return mapping != null
                && (mapping.getStatus() == null || COMPONENT_STATUS_ACTIVE.equalsIgnoreCase(mapping.getStatus()));
    }

    private boolean productTracksSerial(ProductVariant variant) {
        return variant != null
                && variant.getProduct() != null
                && Boolean.TRUE.equals(variant.getProduct().getTrackSerial());
    }

    private String resolveLineSerial(RepairLine line) {
        if (line == null) {
            return null;
        }
        if (line.getSerialNumberId() != null) {
            return serialNumberRepository.findById(line.getSerialNumberId())
                    .map(SerialNumber::getSerialNumber)
                    .map(String::trim)
                    .filter(serial -> !serial.isEmpty())
                    .orElse(trimToNull(line.getSerialNumberText()));
        }
        return trimToNull(line.getSerialNumberText());
    }

    private String resolveReplacementLineSerial(RepairLine line) {
        if (line == null) {
            return null;
        }
        if (line.getReplacementSerialNumberId() != null) {
            return serialNumberRepository.findById(line.getReplacementSerialNumberId())
                    .map(SerialNumber::getSerialNumber)
                    .map(String::trim)
                    .filter(serial -> !serial.isEmpty())
                    .orElse(trimToNull(line.getReplacementSerialNumberText()));
        }
        return trimToNull(line.getReplacementSerialNumberText());
    }

    private String variantName(ProductVariant variant) {
        if (variant == null) {
            return "Linh kiện";
        }
        String productName = variant.getProduct() != null ? trimToNull(variant.getProduct().getProductName()) : null;
        String variantName = trimToNull(variant.getVariantName());
        if (productName == null) {
            return variantName != null ? variantName : "Linh kiện";
        }
        if (variantName == null || productName.equals(variantName)) {
            return productName + " (" + variant.getSku() + ")";
        }
        return productName + " - " + variantName + " (" + variant.getSku() + ")";
    }

    private String appendNote(String current, String addition) {
        String normalizedAddition = trimToNull(addition);
        if (normalizedAddition == null) {
            return trimToNull(current);
        }
        String normalizedCurrent = trimToNull(current);
        if (normalizedCurrent == null) {
            return normalizedAddition;
        }
        return normalizedCurrent + "\n" + normalizedAddition;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
