package com.duylongtech.backend.feature.repair;

import com.duylongtech.backend.enums.DocumentStatus;
import com.duylongtech.backend.enums.RepairStatus;
import com.duylongtech.backend.enums.SerialInstallStatus;

import com.duylongtech.backend.constant.SystemMessage;

import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.notification.AppNotificationService;
import com.duylongtech.backend.feature.payment.PaymentService;
import com.duylongtech.backend.feature.payment.PaymentRequest;

import com.duylongtech.backend.feature.product.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import com.duylongtech.backend.feature.assembly.AssemblyOrder;
import com.duylongtech.backend.feature.assembly.DeviceComponentSerial;
import com.duylongtech.backend.feature.assembly.DeviceComponentSerialRepository;
import com.duylongtech.backend.feature.audit.AuditLogService;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.inventory.InventoryBalance;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentService;
import com.duylongtech.backend.feature.inventory.RepairScrapLineRequest;
import com.duylongtech.backend.feature.inventory.RepairStockOutLineRequest;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.inventory.InventoryDocumentPostedEvent;
import org.springframework.context.event.EventListener;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.SerialNumber;
import com.duylongtech.backend.feature.product.SerialNumberRepository;
import com.duylongtech.backend.feature.repair.Repair;
import com.duylongtech.backend.feature.repair.RepairFeeRepository;
import com.duylongtech.backend.feature.repair.RepairLine;
import com.duylongtech.backend.feature.repair.RepairLineRepository;
import com.duylongtech.backend.feature.repair.RepairRepository;
import com.duylongtech.backend.feature.repair.RepairResponse;
import com.duylongtech.backend.feature.repair.RepairService;
import com.duylongtech.backend.feature.warehouse.Warehouse;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;

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
    private static final String COMPONENT_STATUS_ACTIVE = SerialInstallStatus.ACTIVE.name();
    private static final String COMPONENT_STATUS_REPLACED = "REPLACED";
    private static final String COMPONENT_STATUS_REMOVED = SerialInstallStatus.REMOVED.name();

    // Định nghĩa các bước chuyển trạng thái hợp lệ
    private static final Map<RepairStatus, Set<RepairStatus>> VALID_TRANSITIONS = Map.of(
            RepairStatus.DRAFT,        Set.of(RepairStatus.QUOTATION, RepairStatus.CANCELLED),
            RepairStatus.QUOTATION,    Set.of(RepairStatus.WAITING_FOR_APPROVAL, RepairStatus.DRAFT, RepairStatus.CANCELLED),
            RepairStatus.WAITING_FOR_APPROVAL, Set.of(RepairStatus.CONFIRMED, RepairStatus.QUOTATION, RepairStatus.CANCELLED),
            RepairStatus.CONFIRMED,    Set.of(RepairStatus.WAITING_FOR_EXPORT, RepairStatus.CANCELLED),
            RepairStatus.WAITING_FOR_EXPORT, Set.of(RepairStatus.UNDER_REPAIR, RepairStatus.CANCELLED),
            RepairStatus.UNDER_REPAIR, Set.of(RepairStatus.DONE, RepairStatus.CANCELLED),
            RepairStatus.DONE,         Set.of(),      // Terminal state
            RepairStatus.CANCELLED,    Set.of()       // Terminal state
    );

    private final RepairRepository repairRepository;
    private final RepairLineRepository repairLineRepository;
    private final RepairFeeRepository repairFeeRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final WarehouseRepository warehouseRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final RepairService repairService;
    private final ProductVariantRepository productVariantRepository;
    private final InventoryDocumentService inventoryDocumentService;
    private final SerialNumberRepository serialNumberRepository;
    private final DeviceComponentSerialRepository deviceComponentSerialRepository;
    private final AppNotificationService notificationService;
    private final PaymentService paymentService;

    @FunctionalInterface
    private interface RepairTransitionHandler {
        void handle(Repair repair, String note);
    }

    private RepairTransitionHandler getTransitionHandler(RepairStatus status) {
        return switch(status) {
            case QUOTATION -> (repair, note) -> {
                if (RepairStatus.WAITING_FOR_APPROVAL.name().equals(repair.getRepairStatus())) {
                    repair.reject(note);
                    notificationService.createNotification(
                            "ROLE_TECHNICIAN", repair.getCreatedBy(), "Lệnh sửa chữa bị từ chối duyệt",
                            "Kế toán đã từ chối lệnh sửa chữa " + repair.getRepairCode() + ". Lý do: " + note,
                            "REPAIR_REJECTED", "REPAIR", repair.getId(), "/repairs/" + repair.getId()
                    );
                } else {
                    repair.moveToQuotation();
                }
            };
            case WAITING_FOR_APPROVAL -> (repair, note) -> {
                repair.sendForApproval();
                notificationService.createNotification(
                        "ROLE_ACCOUNTANT", null, "Lệnh sửa chữa chờ duyệt",
                        "Lệnh sửa chữa " + repair.getRepairCode() + " đang chờ bạn duyệt xuất kho.",
                        "REPAIR_APPROVAL", "REPAIR", repair.getId(), "/repairs/" + repair.getId()
                );
            };
            case CONFIRMED -> (repair, note) -> { 
                repair.confirm();
                boolean needsInventory = handleConfirm(repair); 
                if (needsInventory) {
                    repair.waitForExport();
                } else {
                    repair.startRepair();
                }
            };
            case WAITING_FOR_EXPORT -> (repair, note) -> { /* Internal transition */ };
            case UNDER_REPAIR -> (repair, note) -> repair.startRepair();
            case DONE -> (repair, note) -> { handleDone(repair); repair.complete(); };
            case CANCELLED -> (repair, note) -> { handleCancel(repair); repair.cancel(); };
            default -> null;
        };
    }

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

        RepairStatus current;
        RepairStatus target;
        try {
            current = RepairStatus.valueOf(currentStatus);
            target = RepairStatus.valueOf(normalizedTarget);
        } catch (IllegalArgumentException ex) {
            throw new BusinessException(SystemMessage.REP_INVALID_STATUS_TRANSITION);
        }

        // Validate transition
        Set<RepairStatus> allowedNext = VALID_TRANSITIONS.getOrDefault(current, Set.of());
        if (!allowedNext.contains(target)) {
            throw new BusinessException(SystemMessage.REP_INVALID_STATUS_TRANSITION);
        }

        String previousStatus = repair.getRepairStatus();

        // Side-effects + cập nhật trạng thái, tra theo bảng transitionHandlers ở trên
        // thay vì 2 khối switch riêng biệt.
        RepairTransitionHandler handler = getTransitionHandler(target);
        if (handler != null) {
            handler.handle(repair, note);
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

    private boolean handleConfirm(Repair repair) {
        // Hard Block 1: Phải có partner
        if (repair.getPartnerId() == null) {
            throw new BusinessException(SystemMessage.REP_PARTNER_REQUIRED);
        }

        List<RepairLine> stockOutLines = getLinesForStockOut(repair.getId());
        List<RepairLine> removeLines = repairLineRepository.findByRepairIdAndActionType(repair.getId(), ACTION_REMOVE);

        if (stockOutLines.isEmpty() && removeLines.isEmpty()) {
            // Không có linh kiện cần xuất/nhập -> chỉ phí dịch vụ, không cần qua kho
            log.info("[Repair {}] Không có linh kiện ADD/REPLACE/REMOVE, không cần qua kho", repair.getRepairCode());
            return false;
        }

        // Hard Block 2: Kiểm tra tồn kho cho từng linh kiện ADD/REPLACE
        if (!stockOutLines.isEmpty()) {
            Long warehouseId = resolveRepairWarehouseId(repair);

        // Sort theo (variantId, serialNumberId) trước khi lock từng dòng bằng FOR UPDATE:
        // nếu không sort, 2 lệnh sửa chữa CONFIRM đồng thời dùng chung linh kiện nhưng có
        // thứ tự dòng khác nhau có thể khóa chéo nhau -> deadlock ở DB.
        List<RepairLine> sortedLines = stockOutLines.stream()
                .sorted(Comparator
                        .comparing(RepairLine::getComponentVariantId, Comparator.nullsFirst(Long::compareTo))
                        .thenComparing(this::resolveStockOutSerialNumberId, Comparator.nullsFirst(Long::compareTo)))
                .toList();

        for (RepairLine line : sortedLines) {
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
        }

        log.info("[Repair {}] Xác nhận lệnh sửa chữa thành công, tồn kho hợp lệ", repair.getRepairCode());

        // Tạo phiếu xuất/nhập kho nháp
        List<RepairLine> replaceLines = repairLineRepository.findByRepairIdAndActionType(repair.getId(), ACTION_REPLACE);
        Map<Long, SerialNumber> serialById = loadSerialsForLines(repair, stockOutLines, replaceLines, removeLines);

        if (!stockOutLines.isEmpty()) {
            createFinalInventoryDocuments(repair, stockOutLines, serialById);
        }

        List<RepairLine> scrapLines = new java.util.ArrayList<>(removeLines);
        scrapLines.addAll(replaceLines);
        if (!scrapLines.isEmpty()) {
            createScrapDocument(repair, scrapLines, serialById);
        }

        if (!stockOutLines.isEmpty() || !scrapLines.isEmpty()) {
            notificationService.createNotification(
                    "ROLE_WAREHOUSE_CONTROLLER", null, "Có lệnh sửa chữa cần xuất/nhập kho",
                    "Lệnh sửa chữa " + repair.getRepairCode() + " đã được xác nhận. Vui lòng ghi sổ các phiếu xuất/nhập kho liên quan.",
                    "REPAIR_INVENTORY", "REPAIR", repair.getId(), "/repairs/" + repair.getId()
            );
        }
        
        return true;
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

        // Batch-resolve serial number & component variant 1 lần cho toàn bộ lệnh sửa
        Map<Long, SerialNumber> serialById = loadSerialsForLines(repair, allAddLines, replaceLines, removeLines);
        Map<Long, ProductVariant> variantById = loadVariantsForLines(allAddLines, replaceLines, removeLines);

        // validateSerialPresenceForTrackedLines(allAddLines, ACTION_ADD, variantById, serialById);
        // validateSerialPresenceForTrackedLines(replaceLines, ACTION_REPLACE, variantById, serialById);
        // validateSerialPresenceForTrackedLines(removeLines, ACTION_REMOVE, variantById, serialById);

        // (Phiếu kho đã được tạo ở bước CONFIRMED và POST bởi Thủ kho, nên không tạo lại ở đây)

        // 3. Cập nhật cấu hình serial bên trong PC sau sửa chữa.
        updateDeviceComponentSerialLifecycle(repair, allAddLines, replaceLines, removeLines, serialById);

        // 4. Sinh Invoice (Phiếu thu) nội bộ nếu có phát sinh phí (kể cả khi chọn Không xuất hóa đơn)
        if (repair.getTotalAmount().compareTo(BigDecimal.ZERO) > 0) {
            PaymentRequest req = new PaymentRequest();
            req.setPartnerId(repair.getPartnerId());
            req.setAmount(repair.getTotalAmount());
            req.setNote("Thu tiền sửa chữa phiếu " + repair.getRepairCode());
            req.setPaymentMethod("CASH");
            var payment = paymentService.createPaymentReceipt(req);
            
            log.info("[Repair {}] Đã tự động tạo phiếu thu với số tiền {}.", repair.getRepairCode(), repair.getTotalAmount());

            notificationService.createNotification(
                "ROLE_ACCOUNTANT", null, "Hoàn thành lệnh sửa chữa",
                "Lệnh sửa chữa " + repair.getRepairCode() + " đã hoàn thành, phát sinh phí. Vui lòng kiểm tra công nợ.",
                "REPAIR_DONE", "REPAIR", repair.getId(), "/repairs/" + repair.getId()
            );
            notificationService.createNotification(
                "ROLE_CASHIER_CONTROLLER", null, "Có phiếu thu sửa chữa mới",
                "Lệnh sửa chữa " + repair.getRepairCode() + " đã hoàn thành. Vui lòng thu tiền khách hàng.",
                "REPAIR_PAYMENT", "RECEIPT", payment.getId(), "/cashier-workspace?tab=requests"
            );
        }
    }

    /**
     * Chuẩn bị dữ liệu và ủy quyền cho InventoryDocumentService tạo + POST phiếu xuất
     * kho (trừ kho thực tế) cho các linh kiện ADD - RepairWorkflowService không tự
     * new Entity/gọi thẳng repository của module Inventory nữa.
     */
    private void createFinalInventoryDocuments(Repair repair, List<RepairLine> addLines, Map<Long, SerialNumber> serialById) {
        Long warehouseId = resolveRepairWarehouseId(repair);
        Long currentUserId = resolveCurrentUserId();

        List<RepairStockOutLineRequest> lineRequests = new java.util.ArrayList<>();
        for (RepairLine rLine : addLines) {
            BigDecimal actualDoneQty = rLine.getQuantity();
            if (actualDoneQty.compareTo(BigDecimal.ZERO) <= 0) continue;

            Long stockOutSerialNumberId = resolveStockOutSerialNumberId(rLine);
            String serialNumbersText = resolveStockOutSerialText(rLine);
            if (stockOutSerialNumberId != null) {
                SerialNumber sn = serialById.get(stockOutSerialNumberId);
                if (sn != null) {
                    serialNumbersText = sn.getSerialNumber();
                }
            }

            String lineNote = (ACTION_REPLACE.equals(rLine.getActionType()) ? "Linh kiện thay thế: " : "Linh kiện sửa chữa: ")
                    + (rLine.getNote() != null ? rLine.getNote() : "");
            lineRequests.add(new RepairStockOutLineRequest(rLine.getComponentVariantId(), actualDoneQty,
                    rLine.getUnitPrice(), stockOutSerialNumberId, serialNumbersText, lineNote));
        }

        if (lineRequests.isEmpty()) {
            return;
        }

        Long docId = inventoryDocumentService.createExportForRepair(repair.getId(), repair.getRepairCode(), warehouseId,
                repair.getPartnerId(), currentUserId,
                repair.getCreatedBy() != null ? repair.getCreatedBy() : currentUserId,
                repair.getResponsiblePerson(), lineRequests);

        if (docId == null) {
            log.warn("[Repair {}] Phiếu xuất kho REP-EX-{} đã tồn tại hoặc không có dòng hợp lệ, bỏ qua",
                    repair.getRepairCode(), repair.getRepairCode());
            return;
        }

        log.info("[Repair {}] Đã tạo phiếu xuất kho DRAFT REP-EX-{} thành công qua InventoryDocumentService",
                repair.getRepairCode(), repair.getRepairCode());
    }

    /**
     * Chuẩn bị dữ liệu và ủy quyền cho InventoryDocumentService tạo + POST phiếu nhập
     * kho Scrap cho linh kiện bị tháo ra (REMOVE).
     */
    private void createScrapDocument(Repair repair, List<RepairLine> removeLines, Map<Long, SerialNumber> serialById) {
        Long scrapWarehouseId = resolveScrapWarehouseId();
        if (scrapWarehouseId == null) {
            log.warn("[Repair {}] Không tìm thấy kho Scrap, bỏ qua nhập kho phế liệu", repair.getRepairCode());
            return;
        }

        Long currentUserId = resolveCurrentUserId();

        List<RepairScrapLineRequest> lineRequests = new java.util.ArrayList<>();
        for (RepairLine line : removeLines) {
            String serialNumbersText = line.getSerialNumberText();
            if (line.getSerialNumberId() != null) {
                SerialNumber sn = serialById.get(line.getSerialNumberId());
                if (sn != null) {
                    serialNumbersText = sn.getSerialNumber();
                }
            }
            lineRequests.add(new RepairScrapLineRequest(resolveRemovedComponentVariantId(line, serialById),
                    line.getQuantity(), line.getSerialNumberId(), serialNumbersText));
        }

        if (lineRequests.isEmpty()) {
            return;
        }

        Long docId = inventoryDocumentService.createScrapImportForRepair(repair.getId(), repair.getRepairCode(),
                scrapWarehouseId, repair.getPartnerId(), currentUserId,
                repair.getCreatedBy() != null ? repair.getCreatedBy() : currentUserId,
                repair.getResponsiblePerson(), lineRequests);

        if (docId == null) {
            log.warn("[Repair {}] Phiếu Scrap REP-SCRAP-{} đã tồn tại hoặc không có dòng hợp lệ, bỏ qua",
                    repair.getRepairCode(), repair.getRepairCode());
            return;
        }

        log.info("[Repair {}] Đã tạo phiếu Scrap DRAFT REP-SCRAP-{} thành công qua InventoryDocumentService",
                repair.getRepairCode(), repair.getRepairCode());
    }

    // =====================================================================
    // CANCELLED
    // =====================================================================

    private void handleCancel(Repair repair) {
        if (RepairStatus.DONE.name().equals(repair.getRepairStatus())) {
            throw new BusinessException(SystemMessage.REP_CANNOT_CANCEL);
        }
        // Với luồng mới, không có phiếu DRAFT, không giữ chỗ -> Không cần rollback inventory
        log.info("[Repair {}] Hủy lệnh sửa chữa", repair.getRepairCode());
    }

    // =====================================================================
    // Utility helpers
    // =====================================================================

    @EventListener
    public void onInventoryDocumentPosted(InventoryDocumentPostedEvent event) {
        if ("REPAIR".equals(event.getReferenceType()) && event.getReferenceId() != null) {
            repairRepository.findById(event.getReferenceId()).ifPresent(repair -> {
                if (RepairStatus.WAITING_FOR_EXPORT.name().equals(repair.getRepairStatus())) {
                    // Update state
                    repair.startRepair();
                    repairRepository.save(repair);
                    
                    // Audit log
                    auditLogService.logEvent(null, "AUTO_START_REPAIR", "Repair", repair.getId(), "SUCCESS",
                            "Thủ kho đã ghi sổ phiếu xuất kho, tự động chuyển sang Đang sửa chữa", null, null);
                            
                    // Push notification to technician
                    notificationService.createNotification(
                            "ROLE_TECHNICIAN", repair.getCreatedBy(), 
                            "Bắt đầu sửa chữa",
                            "Thủ kho đã ghi sổ phiếu xuất cho lệnh sửa chữa " + repair.getRepairCode() + ". Bạn có thể bắt đầu sửa chữa.",
                            "REPAIR_STARTED", "REPAIR", repair.getId(), "/repairs/" + repair.getId()
                    );
                }
            });
        }
    }

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

    private void validateSerialPresenceForTrackedLines(List<RepairLine> lines, String actionType,
            Map<Long, ProductVariant> variantById, Map<Long, SerialNumber> serialById) {
        for (RepairLine line : lines) {
            ProductVariant variant = variantById.get(line.getComponentVariantId());
            if (variant == null || !productTracksSerial(variant)) {
                continue;
            }

            boolean missingSerial = switch (actionType) {
                case ACTION_ADD -> line.getSerialNumberId() == null;
                case ACTION_REPLACE -> trimToNull(resolveLineSerial(line, serialById)) == null
                        || line.getReplacementSerialNumberId() == null;
                default -> trimToNull(resolveLineSerial(line, serialById)) == null;
            };
            if (missingSerial) {
                String variantName = variantName(variant);
                throw new BusinessException(
                        String.format(SystemMessage.REP_SERIAL_REQUIRED.getMessage(), variantName));
            }
        }
    }

    /**
     * Gom tất cả serialNumberId/replacementSerialNumberId cần dùng trong handleDone
     * (bao gồm cả serial thành phẩm của repair) và tải 1 lần duy nhất.
     */
    private Map<Long, SerialNumber> loadSerialsForLines(Repair repair, List<RepairLine> addLines,
            List<RepairLine> replaceLines, List<RepairLine> removeLines) {
        Set<Long> serialIds = new HashSet<>();
        if (repair.getSerialNumberId() != null) {
            serialIds.add(repair.getSerialNumberId());
        }
        for (List<RepairLine> lines : List.of(addLines, replaceLines, removeLines)) {
            for (RepairLine line : lines) {
                if (line.getSerialNumberId() != null) {
                    serialIds.add(line.getSerialNumberId());
                }
                if (line.getReplacementSerialNumberId() != null) {
                    serialIds.add(line.getReplacementSerialNumberId());
                }
            }
        }
        if (serialIds.isEmpty()) {
            return Map.of();
        }
        return serialNumberRepository.findAllById(serialIds).stream()
                .collect(Collectors.toMap(SerialNumber::getId, s -> s));
    }

    /**
     * Gom tất cả componentVariantId cần dùng trong handleDone và tải 1 lần duy nhất.
     */
    private Map<Long, ProductVariant> loadVariantsForLines(List<RepairLine> addLines,
            List<RepairLine> replaceLines, List<RepairLine> removeLines) {
        Set<Long> variantIds = new HashSet<>();
        for (List<RepairLine> lines : List.of(addLines, replaceLines, removeLines)) {
            for (RepairLine line : lines) {
                if (line.getComponentVariantId() != null) {
                    variantIds.add(line.getComponentVariantId());
                }
            }
        }
        if (variantIds.isEmpty()) {
            return Map.of();
        }
        return productVariantRepository.findAllById(variantIds).stream()
                .collect(Collectors.toMap(ProductVariant::getId, v -> v));
    }

    private void updateDeviceComponentSerialLifecycle(Repair repair, List<RepairLine> addLines,
            List<RepairLine> replaceLines, List<RepairLine> removeLines, Map<Long, SerialNumber> serialById) {
        if (repair.getSerialNumberId() == null) {
            return;
        }

        SerialNumber targetSerialNumber = serialById.get(repair.getSerialNumberId());
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
                .filter(line -> trimToNull(resolveLineSerial(line, serialById)) != null)
                .toList();
        java.util.List<RepairLine> serialReplaceLines = replaceLines.stream()
                .filter(line -> trimToNull(resolveLineSerial(line, serialById)) != null)
                .filter(line -> trimToNull(resolveReplacementLineSerial(line, serialById)) != null)
                .toList();
        java.util.List<RepairLine> serialRemoveLines = removeLines.stream()
                .filter(line -> trimToNull(resolveLineSerial(line, serialById)) != null)
                .toList();
        java.util.List<DeviceComponentSerial> changedMappings = new java.util.ArrayList<>();

        for (RepairLine replaceLine : serialReplaceLines) {
            String removedSerial = resolveLineSerial(replaceLine, serialById);
            String replacementSerial = resolveReplacementLineSerial(replaceLine, serialById);
            DeviceComponentSerial currentMapping = findActiveMapping(mappings, replaceLine.getComponentVariantId(), removedSerial);
            if (currentMapping == null) {
                throw new BusinessException(String.format(SystemMessage.REP_ERR_007.getMessage(), removedSerial, targetSerial));
            }
            if (findActiveMapping(mappings, replaceLine.getComponentVariantId(), replacementSerial) != null) {
                throw new BusinessException(String.format(SystemMessage.REP_ERR_006.getMessage(), replacementSerial, targetSerial));
            }

            currentMapping.markAsRemoved(repair.getId(), null, "Tháo dỡ thay thế linh kiện");
            currentMapping.markAsReplaced(replacementSerial);
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
            String removedSerial = resolveLineSerial(removeLine, serialById);
            DeviceComponentSerial currentMapping = findActiveMapping(mappings, removeLine.getComponentVariantId(), removedSerial);
            if (currentMapping == null) {
                throw new BusinessException(String.format(SystemMessage.REP_ERR_007.getMessage(), removedSerial, targetSerial));
            }

            currentMapping.markAsRemoved(repair.getId(), null, "Tháo dỡ thay thế linh kiện");
            currentMapping.markAsReplaced(null);
            markRemovedByRepair(currentMapping, repair, now);
            currentMapping.setNote(appendNote(currentMapping.getNote(),
                    "Loại bỏ từ phiếu sửa " + repair.getRepairCode()));
            changedMappings.add(currentMapping);
        }

        for (RepairLine addLine : serialAddLines) {
            String addedSerial = resolveLineSerial(addLine, serialById);
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

        DeviceComponentSerial dcs = new DeviceComponentSerial();
        dcs.initForRepair(sourceOrder, targetVariant, targetSerial, componentVariant, componentSerial.trim(), repair.getId(), appendNote(note, trimToNull(line.getNote())), currentUserId);
        return dcs;
    }

    private void markRemovedByRepair(DeviceComponentSerial mapping, Repair repair, LocalDateTime removedAt) {
        mapping.markAsRemoved(repair.getId(), null, null);
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

    private Long resolveRemovedComponentVariantId(RepairLine line, Map<Long, SerialNumber> serialById) {
        if (line == null) {
            return null;
        }
        if (line.getSerialNumberId() != null) {
            SerialNumber sn = serialById.get(line.getSerialNumberId());
            return sn != null ? sn.getVariantId() : line.getComponentVariantId();
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

    private String resolveLineSerial(RepairLine line, Map<Long, SerialNumber> serialById) {
        if (line == null) {
            return null;
        }
        if (line.getSerialNumberId() != null) {
            SerialNumber sn = serialById.get(line.getSerialNumberId());
            String serial = sn != null ? trimToNull(sn.getSerialNumber()) : null;
            return serial != null ? serial : trimToNull(line.getSerialNumberText());
        }
        return trimToNull(line.getSerialNumberText());
    }

    private String resolveReplacementLineSerial(RepairLine line, Map<Long, SerialNumber> serialById) {
        if (line == null) {
            return null;
        }
        if (line.getReplacementSerialNumberId() != null) {
            SerialNumber sn = serialById.get(line.getReplacementSerialNumberId());
            String serial = sn != null ? trimToNull(sn.getSerialNumber()) : null;
            return serial != null ? serial : trimToNull(line.getReplacementSerialNumberText());
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
