package com.duylongtech.backend.service;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.response.RepairResponse;
import com.duylongtech.backend.entity.*;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.*;
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
            "CONFIRMED",   Set.of("UNDER_REPAIR", "CANCELLED"),
            "UNDER_REPAIR", Set.of("DONE", "CANCELLED"),
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

        // Tạo phiếu xuất kho Draft (Reserve) để giữ chỗ linh kiện
        createReserveInventoryDocument(repair, addLines, warehouseId);
        log.info("[Repair {}] Đã tạo phiếu xuất kho Reserve thành công", repair.getRepairCode());
    }

    /**
     * Tạo phiếu xuất kho trạng thái DRAFT để "giữ chỗ" linh kiện.
     * Phiếu này sẽ được POST (ghi sổ) khi lệnh chuyển sang DONE.
     */
    private void createReserveInventoryDocument(Repair repair, List<RepairLine> addLines, Long warehouseId) {
        Long currentUserId = resolveCurrentUserId();
        String docCode = "REP-EX-" + repair.getRepairCode();

        // Tránh tạo trùng nếu gọi lại
        if (inventoryDocumentRepository.existsByDocCode(docCode)) {
            log.warn("[Repair {}] Phiếu xuất kho Reserve {} đã tồn tại, bỏ qua tạo mới", repair.getRepairCode(), docCode);
            return;
        }

        InventoryDocument reserveDoc = InventoryDocument.builder()
                .docCode(docCode)
                .docType(REPAIR_DOC_TYPE_EXPORT)
                .issuePurpose("REPAIR")
                .referenceType("REPAIR")
                .referenceId(repair.getId())
                .warehouseId(warehouseId)
                .partnerId(repair.getPartnerId())
                .docDate(LocalDate.now())
                .status("DRAFT") // Draft = Reserve (giữ chỗ chưa trừ kho thực tế)
                .note("Phiếu xuất linh kiện sửa chữa - Lệnh " + repair.getRepairCode())
                .createdBy(currentUserId)
                .build();

        // Thêm các dòng linh kiện
        for (RepairLine line : addLines) {
            InventoryDocumentLine docLine = InventoryDocumentLine.builder()
                    .inventoryDocument(reserveDoc)
                    .variantId(line.getComponentVariantId())
                    .quantityIn(BigDecimal.ZERO)
                    .quantityOut(line.getQuantity())
                    .unitCost(BigDecimal.ZERO) // Giá vốn sẽ được FIFO tính khi POST
                    .unitPrice(line.getUnitPrice())
                    .lineAmount(line.getUnitPrice().multiply(line.getQuantity()))
                    .serialNumberId(line.getSerialNumberId())
                    .note("Linh kiện sửa chữa: " + (line.getNote() != null ? line.getNote() : ""))
                    .build();
            reserveDoc.getLines().add(docLine);
        }

        inventoryDocumentRepository.save(reserveDoc);
        log.info("[Repair {}] Tạo phiếu Reserve {} thành công với {} dòng linh kiện",
                repair.getRepairCode(), docCode, addLines.size());
    }

    // =====================================================================
    // DONE: Ghi sổ phiếu kho + Sinh Scrap + (stub) Sinh Invoice
    // =====================================================================

    private void handleDone(Repair repair) {
        Long warehouseId = resolveRepairWarehouseId(repair);
        String docCode = "REP-EX-" + repair.getRepairCode();

        // 1. Post phiếu xuất kho linh kiện ADD (nếu có)
        postReserveDocument(repair, docCode);

        // 2. Sinh phiếu nhập kho Scrap cho linh kiện REMOVE (nếu có)
        List<RepairLine> removeLines = repairLineRepository.findByRepairIdAndActionType(
                repair.getId(), "REMOVE");
        if (!removeLines.isEmpty()) {
            createScrapDocument(repair, removeLines);
        }

        // 3. Stub: Sinh Invoice nếu invoice_method != 'none'
        // Trong Phase 2 chưa có InvoiceService, sẽ implement ở Phase tiếp theo
        if (!"none".equals(repair.getInvoiceMethod()) && repair.getTotalAmount().compareTo(BigDecimal.ZERO) > 0) {
            log.info("[Repair {}] Invoice method: {} - Total: {}. Invoice generation stub (sẽ implement ở Phase 3)",
                    repair.getRepairCode(), repair.getInvoiceMethod(), repair.getTotalAmount());
            // TODO: Gọi InvoiceService khi implement module Invoicing
        }
    }

    /**
     * Chuyển phiếu xuất kho Reserve từ DRAFT -> POSTED (trừ kho thực tế).
     * Sử dụng cơ chế FIFO từ InventoryDocumentService.
     * Trong implementation này, ta trực tiếp cập nhật InventoryBalance để giảm tồn kho.
     */
    private void postReserveDocument(Repair repair, String docCode) {
        InventoryDocument reserveDoc = inventoryDocumentRepository
                .findByDocCode(docCode)
                .orElse(null);

        if (reserveDoc == null) {
            log.warn("[Repair {}] Không tìm thấy phiếu Reserve {}, bỏ qua post kho", repair.getRepairCode(), docCode);
            return;
        }

        if ("POSTED".equals(reserveDoc.getStatus())) {
            log.info("[Repair {}] Phiếu {} đã được POST, bỏ qua", repair.getRepairCode(), docCode);
            return;
        }

        // Chuyển trạng thái phiếu -> POSTED
        reserveDoc.setStatus("POSTED");
        reserveDoc.setPostedAt(LocalDateTime.now());
        inventoryDocumentRepository.save(reserveDoc);

        // Trừ tồn kho thực tế cho từng dòng
        Long warehouseId = reserveDoc.getWarehouseId();
        for (InventoryDocumentLine line : reserveDoc.getLines()) {
            InventoryBalance balance;
            if (line.getSerialNumberId() != null) {
                balance = inventoryBalanceRepository.findByWarehouseVariantSerialForUpdate(
                        warehouseId, line.getVariantId(), line.getSerialNumberId(), "GOOD").orElse(null);
            } else {
                balance = inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(
                        warehouseId, line.getVariantId(), "GOOD").orElse(null);
            }
            if (balance != null && line.getQuantityOut() != null) {
                BigDecimal newQty = balance.getQuantityOnHand().subtract(line.getQuantityOut());
                if (newQty.compareTo(BigDecimal.ZERO) < 0) {
                    throw new BusinessException(SystemMessage.INV_NOT_ENOUGH_STOCK);
                }
                balance.setQuantityOnHand(newQty);
                inventoryBalanceRepository.save(balance);
            }
        }

        log.info("[Repair {}] Đã POST phiếu xuất kho {} thành công", repair.getRepairCode(), docCode);
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
                .status("POSTED") // Trực tiếp POSTED - nhập ngay vào kho Scrap
                .postedAt(LocalDateTime.now())
                .note("Phiếu nhập kho phế liệu - Lệnh sửa chữa " + repair.getRepairCode())
                .createdBy(currentUserId)
                .build();

        for (RepairLine line : removeLines) {
            InventoryDocumentLine scrapLine = InventoryDocumentLine.builder()
                    .inventoryDocument(scrapDoc)
                    .variantId(line.getComponentVariantId())
                    .quantityIn(line.getQuantity())
                    .quantityOut(BigDecimal.ZERO)
                    .unitCost(BigDecimal.ZERO) // Linh kiện tháo ra ghi nhận giá vốn = 0 (phế liệu)
                    .unitPrice(BigDecimal.ZERO)
                    .lineAmount(BigDecimal.ZERO)
                    .serialNumberId(line.getSerialNumberId())
                    .note("Linh kiện tháo ra từ lệnh sửa " + repair.getRepairCode())
                    .build();
            scrapDoc.getLines().add(scrapLine);
        }

        inventoryDocumentRepository.save(scrapDoc);

        // Cập nhật tồn kho Scrap
        for (RepairLine line : removeLines) {
            InventoryBalance scrapBalance;
            if (line.getSerialNumberId() != null) {
                scrapBalance = inventoryBalanceRepository.findByWarehouseVariantSerialForUpdate(
                        scrapWarehouseId, line.getComponentVariantId(), line.getSerialNumberId(), "GOOD").orElse(null);
            } else {
                scrapBalance = inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(
                        scrapWarehouseId, line.getComponentVariantId(), "GOOD").orElse(null);
            }

            if (scrapBalance == null) {
                scrapBalance = InventoryBalance.builder()
                        .warehouseId(scrapWarehouseId)
                        .variantId(line.getComponentVariantId())
                        .serialNumberId(line.getSerialNumberId())
                        .stockStatus("GOOD")
                        .quantityOnHand(BigDecimal.ZERO)
                        .quantityReserved(BigDecimal.ZERO)
                        .averageCost(BigDecimal.ZERO)
                        .updatedAt(LocalDateTime.now())
                        .build();
            }
            scrapBalance.setQuantityOnHand(scrapBalance.getQuantityOnHand().add(line.getQuantity()));
            scrapBalance.setUpdatedAt(LocalDateTime.now());
            inventoryBalanceRepository.save(scrapBalance);
        }

        log.info("[Repair {}] Đã tạo phiếu Scrap {} với {} dòng linh kiện tháo ra",
                repair.getRepairCode(), scrapDocCode, removeLines.size());
    }

    // =====================================================================
    // CANCELLED
    // =====================================================================

    private void handleCancel(Repair repair) {
        if ("DONE".equals(repair.getRepairStatus())) {
            throw new BusinessException(SystemMessage.REP_CANNOT_CANCEL);
        }

        // Nếu đã tạo phiếu Reserve -> hủy phiếu đó
        String docCode = "REP-EX-" + repair.getRepairCode();
        inventoryDocumentRepository.findByDocCode(docCode)
                .filter(d -> "DRAFT".equals(d.getStatus()))
                .ifPresent(doc -> {
                    doc.setStatus("CANCELLED");
                    inventoryDocumentRepository.save(doc);
                    log.info("[Repair {}] Đã hủy phiếu Reserve {}", repair.getRepairCode(), docCode);
                });
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
        return warehouseRepository.findAll().stream()
                .filter(w -> "APPROVED".equals(w.getStatus()))
                .filter(w -> !"SCRAP".equalsIgnoreCase(w.getCode()))
                .findFirst()
                .map(Warehouse::getId)
                .orElseThrow(() -> new BusinessException(SystemMessage.WH_NOT_FOUND));
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
