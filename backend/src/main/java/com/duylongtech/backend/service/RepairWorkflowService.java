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

        List<RepairLine> addLines = repairLineRepository.findByRepairIdAndActionType(
                repair.getId(), "ADD");

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
            if (line.getSerialNumberId() != null) {
                balance = inventoryBalanceRepository.findByWarehouseVariantSerialForUpdate(
                        warehouseId, line.getComponentVariantId(), line.getSerialNumberId(), "GOOD").orElse(null);
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
        // 0. Validate: linh kiện ADD, trackSerial=true phải có serialNumberId
        List<RepairLine> allAddLines = repairLineRepository.findByRepairIdAndActionType(repair.getId(), "ADD");
        for (RepairLine line : allAddLines) {
            // Lấy variant -> product -> trackSerial
            productVariantRepository.findById(line.getComponentVariantId()).ifPresent(variant -> {
                if (Boolean.TRUE.equals(variant.getProduct().getTrackSerial()) && line.getSerialNumberId() == null) {
                    String variantName = variant.getProduct().getProductName() + " (" + variant.getSku() + ")";
                    throw new BusinessException(
                        String.format(SystemMessage.REP_SERIAL_REQUIRED.getMessage(), variantName));
                }
            });
        }

        // 1. Post phiếu xuất kho linh kiện ADD (nếu có)
        if (!allAddLines.isEmpty()) {
            createFinalInventoryDocuments(repair, allAddLines);
        }

        // 2. Sinh phiếu nhập kho Scrap cho linh kiện REMOVE (nếu có)
        List<RepairLine> removeLines = repairLineRepository.findByRepairIdAndActionType(
                repair.getId(), "REMOVE");
        if (!removeLines.isEmpty()) {
            createScrapDocument(repair, removeLines);
        }

        // 3. Stub: Sinh Invoice nếu invoice_method != 'none'
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

            String serialNumbersText = rLine.getSerialNumberText();
            if (rLine.getSerialNumberId() != null) {
                serialNumbersText = serialNumberRepository.findById(rLine.getSerialNumberId())
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
                    .serialNumberId(rLine.getSerialNumberId())
                    .serialNumbersText(serialNumbersText)
                    .note("Linh kiện sửa chữa: " + (rLine.getNote() != null ? rLine.getNote() : ""))
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
                throw new BusinessException("Lỗi khi ghi sổ phiếu xuất linh kiện: " + e.getMessage());
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
                    .variantId(line.getComponentVariantId())
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
                throw new BusinessException("Lỗi khi ghi sổ phiếu Scrap: " + e.getMessage());
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
}
