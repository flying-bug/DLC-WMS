package com.duylongtech.backend.feature.repair;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.enums.*;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.audit.AuditLogService;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.einvoice.EInvoiceService;
import com.duylongtech.backend.feature.inventory.*;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.notification.AppNotificationService;
import com.duylongtech.backend.feature.payment.PaymentResponse;
import com.duylongtech.backend.feature.payment.PaymentService;
import com.duylongtech.backend.feature.partner.PartnerLedgerRepository;
import com.duylongtech.backend.feature.partner.PartnerLedgerService;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderService;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.SerialNumber;
import com.duylongtech.backend.feature.product.SerialNumberRepository;
import com.duylongtech.backend.feature.warehouse.Warehouse;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.duylongtech.backend.feature.system.EmailService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RepairWorkflowService {
    private static final String REPAIR = "REPAIR";
    private static final String GOOD = "GOOD";

    private final RepairRepository repairRepository;
    private final RepairLineRepository repairLineRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final StockReservationRepository stockReservationRepository;
    private final InventoryDocumentRepository inventoryDocumentRepository;
    private final InventoryDocumentService inventoryDocumentService;
    private final EInvoiceService eInvoiceService;
    private final PurchaseOrderService purchaseOrderService;
    private final EmailService emailService;
    private final WarehouseRepository warehouseRepository;
    private final PartnerRepository partnerRepository;
    private final UserRepository userRepository;
    private final ProductVariantRepository productVariantRepository;
    private final SerialNumberRepository serialNumberRepository;
    private final RepairService repairService;
    private final PaymentService paymentService;
    private final AuditLogService auditLogService;
    private final AppNotificationService notificationService;
    private final RepairInventorySyncService repairInventorySyncService;
    private final PartnerLedgerService partnerLedgerService;
    private final PartnerLedgerRepository partnerLedgerRepository;
    private final RepairPhotoService repairPhotoService;

    @Transactional
    public RepairResponse assign(Long repairId) {
        requireAnyRole("ROLE_ACCOUNTANT", "ROLE_SUPER_ADMIN", "ROLE_MANAGER", "ROLE_RECEPTIONIST");
        Repair repair = lockRepair(repairId);
        if (!RepairStatus.DRAFT.name().equals(repair.getRepairStatus())) {
            throw invalidTransition();
        }
        if (repair.getPartnerId() == null || repair.getAssignedTechnicianId() == null || repair.getWarehouseId() == null) {
            throw new BusinessException("Lệnh chưa đủ khách hàng, kho và KTV");
        }
        repair.assign(repair.getAssignedTechnicianId(), currentUserId());
        repairRepository.save(repair);
        // Lock INTAKE photos once assigned - tiếp nhận đã đủ ảnh
        repairPhotoService.lockPhotosForStatus(repair.getId(), RepairStatus.DIAGNOSING.name());
        audit(repair, "ASSIGN", "Giao KTV: " + repair.getAssignedTechnicianId());
        notifyAfterCommit(null, repair.getAssignedTechnicianId(), "Lệnh sửa chữa mới: " + repair.getRepairCode(),
                "Bạn được phân công lệnh " + repair.getRepairCode(), repair.getId());
        return detail(repair);
    }

    @Transactional
    public RepairResponse saveDiagnosis(Long repairId, RepairDiagnosisRequest request) {
        Repair repair = lockRepair(repairId);
        requireAssignedTechnician(repair);
        if (!RepairStatus.DIAGNOSING.name().equals(repair.getRepairStatus())) throw invalidTransition();
        repair.setDiagnosisNote(trimToNull(request.getDiagnosisNote()));
        repair.setSolutionDescription(trimToNull(request.getSolutionDescription()));
        repairRepository.save(repair);
        audit(repair, "DIAGNOSE", "Cập nhật chẩn đoán");
        return detail(repair);
    }

    @Transactional
    public RepairResponse submitQuotation(Long repairId) {
        Repair repair = lockRepair(repairId);
        requireAssignedTechnician(repair);
        if (!RepairStatus.DIAGNOSING.name().equals(repair.getRepairStatus())) {
            throw invalidTransition();
        }
        if (Boolean.TRUE.equals(repair.getUnderWarranty())) {
            Map<Long, BigDecimal> shortfall = reserveAndGetShortfall(repair);
            if (shortfall.isEmpty()) {
                repair.markUnderRepair();
                repairRepository.save(repair);
                audit(repair, "SUBMIT_QUOTATION", "Bảo hành 100%: Đủ linh kiện, tự động chuyển UNDER_REPAIR");
            } else {
                repair.markWaitingForParts();
                repairRepository.save(repair);
                audit(repair, "SUBMIT_QUOTATION", "Bảo hành 100%: Thiếu linh kiện -> WAITING_FOR_PARTS");
                purchaseOrderService.autoCreatePurchaseOrder(repair.getId(), repair.getRepairCode(), repair.getWarehouseId(), shortfall, currentUserId());
            }
        } else {
            repair.submitQuotation(currentUserId());
            repairRepository.save(repair);
            audit(repair, "SUBMIT_QUOTATION", "KTV gửi báo giá");
        }
        return detail(repair);
    }

    @Transactional
    public RepairResponse approve(Long repairId) {
        requireAnyRole("ROLE_ACCOUNTANT", "ROLE_SUPER_ADMIN", "ROLE_MANAGER");
        Repair repair = lockRepair(repairId);
        if (!RepairStatus.QUOTATION_PENDING.name().equals(repair.getRepairStatus())) {
            throw invalidTransition();
        }
        Long actorId = currentUserId();
        Warehouse repairWarehouse = warehouseRepository.findById(repair.getWarehouseId())
                .orElseThrow(() -> new BusinessException(SystemMessage.WH_NOT_FOUND));
        Long scrapWarehouseId = repair.getScrapWarehouseId();
        
        repair.approve(actorId, scrapWarehouseId);
        repairRepository.save(repair);
        // Lock DIAGNOSIS photos - báo giá đã được lập, không chỉnh sửa chẩn đoán nữa
        repairPhotoService.lockPhotosForStatus(repair.getId(), RepairStatus.APPROVED.name());

        Map<Long, BigDecimal> shortfall = reserveAndGetShortfall(repair);
        
        if (shortfall.isEmpty()) {
            repair.markUnderRepair();
            repairRepository.save(repair);
            audit(repair, "APPROVE", "Khách đồng ý, duyệt báo giá (đủ linh kiện -> UNDER_REPAIR)");
        } else {
            repair.markWaitingForParts();
            repairRepository.save(repair);
            audit(repair, "APPROVE", "Duyệt báo giá (thiếu linh kiện -> WAITING_FOR_PARTS)");
            // TASK-11: Call auto PO
            purchaseOrderService.autoCreatePurchaseOrder(repair.getId(), repair.getRepairCode(), repair.getWarehouseId(), shortfall, actorId);
        }
        return detail(repair);
    }

    @Transactional
    public RepairResponse decline(Long repairId, String reason) {
        requireAnyRole("ROLE_ACCOUNTANT", "ROLE_SUPER_ADMIN", "ROLE_MANAGER");
        Repair repair = lockRepair(repairId);
        if (!RepairStatus.QUOTATION_PENDING.name().equals(repair.getRepairStatus())) {
            throw invalidTransition();
        }
        String normalizedReason = requireText(reason, "Lý do từ chối là bắt buộc");
        repair.decline(currentUserId(), normalizedReason);
        repairRepository.save(repair);
        audit(repair, "DECLINE", "Khách từ chối sửa: " + normalizedReason);
        return detail(repair);
    }

    @Transactional
    public RepairResponse completeRepair(Long repairId, RepairFinishRequest request) {
        Repair repair = lockRepair(repairId);
        requireAssignedTechnician(repair);
        if (!RepairStatus.UNDER_REPAIR.name().equals(repair.getRepairStatus())) {
            throw invalidTransition();
        }
        String outcome = normalizeOutcome(request.getOutcome());
        repair.completeRepair(currentUserId(), outcome, request.getQcResult(), request.getQcNote(), request.getQcChecklist());
        repairRepository.save(repair);
        
        // TASK-16: Generate inventory documents at completion
        generateInventoryDocumentsAtCompletion(repair, currentUserId(), repair.getScrapWarehouseId());
        
        // TASK-16: Create draft invoice if needed
        eInvoiceService.createDraftInvoiceFromRepair(repair, currentUserId());
        
        // Lock COMPLETION photos after repair is done
        repairPhotoService.lockPhotosForStatus(repair.getId(), RepairStatus.READY_FOR_DELIVERY.name());
        
        // TASK-19: Send Email on Complete
        String customerEmail = null;
        String customerName = null;
        if (repair.getPartnerId() != null) {
            Partner partner = partnerRepository.findById(repair.getPartnerId()).orElse(null);
            if (partner != null && partner.getEmail() != null && !partner.getEmail().isBlank()) {
                customerEmail = partner.getEmail();
                customerName = partner.getName();
            }
        }
        
        if (customerEmail != null) {
            emailService.sendRepairCompletedEmail(
                    customerEmail, 
                    repair.getRepairCode(), 
                    customerName, 
                    repair.getIssueDescription(), 
                    repair.getSolutionDescription(), 
                    repair.getCustomerPayAmount()
            );
        }

        audit(repair, "COMPLETE_REPAIR", "Hoàn thành kỹ thuật sửa chữa");
        notifyCompleted(repair);
        return detail(repair);
    }

    @Transactional
    public RepairResponse close(Long repairId, RepairCloseRequest request) {
        requireAnyRole("ROLE_ACCOUNTANT", "ROLE_SUPER_ADMIN", "ROLE_MANAGER");
        Repair repair = lockRepair(repairId);
        if (!RepairStatus.READY_FOR_DELIVERY.name().equals(repair.getRepairStatus())) {
            throw invalidTransition();
        }
        
        String paymentStatus = request != null ? request.getPaymentStatus() : null;
        
        if ("DEBT_RECORDED".equals(paymentStatus)) {
            if (repair.getCustomerPayAmount().compareTo(BigDecimal.ZERO) > 0
                    && partnerLedgerRepository.findTopByEntityTypeAndEntityIdOrderByIdDesc("REPAIR", repair.getId()).isEmpty()) {
                partnerLedgerService.recordLedger(repair.getPartnerId(), "REPAIR", repair.getId(), repair.getRepairCode(),
                        repair.getCustomerPayAmount(), BigDecimal.ZERO,
                        "Ghi nhận phải thu từ lệnh sửa chữa " + repair.getRepairCode());
            }
        }

        repair.closeRepair(currentUserId(), paymentStatus);
        repairRepository.save(repair);
        audit(repair, "CLOSE", "Đóng phiếu sửa chữa");
        return detail(repair);
    }

    // TASK-16: Generate inventory documents at completion
    private void generateInventoryDocumentsAtCompletion(Repair repair, Long actorId, Long scrapWarehouseId) {
        List<RepairLine> lines = repairLineRepository.findByRepairId(repair.getId());
        
        List<RepairLine> exportLines = lines.stream()
                .filter(l -> "ADD".equals(l.getActionType()) || "REPLACE".equals(l.getActionType()))
                .toList();
        List<RepairLine> importLines = lines.stream()
                .filter(l -> "REMOVE".equals(l.getActionType()) || "REPLACE".equals(l.getActionType()))
                .toList();
        
        User technician = userRepository.findById(repair.getAssignedTechnicianId()).orElseThrow();

        if (!exportLines.isEmpty()) {
            List<RepairStockOutLineRequest> outLines = exportLines.stream()
                    .map(line -> new RepairStockOutLineRequest(line.getComponentVariantId(), line.getQuantity(),
                            line.getUnitPrice(), null, null, "Linh kiện cho lệnh " + repair.getRepairCode()))
                    .toList();
            inventoryDocumentService.createExportForRepair(repair.getId(), repair.getRepairCode(),
                    repair.getWarehouseId(), repair.getPartnerId(), actorId, repair.getAssignedTechnicianId(),
                    technician.getFullName(), outLines);
        }

        if (!importLines.isEmpty() && scrapWarehouseId != null) {
            List<RepairScrapLineRequest> inLines = importLines.stream()
                    .map(line -> new RepairScrapLineRequest(line.getComponentVariantId(), line.getQuantity(),
                            line.getSerialNumberId(), trimToNull(line.getSerialNumberText())))
                    .toList();
            inventoryDocumentService.createScrapImportForRepair(repair.getId(), repair.getRepairCode(),
                    scrapWarehouseId, repair.getPartnerId(), actorId, repair.getAssignedTechnicianId(),
                    technician.getFullName(), inLines);
        }
    }

    // TASK-10: Reserve and get shortfall
    private Map<Long, BigDecimal> reserveAndGetShortfall(Repair repair) {
        List<RepairLine> lines = repairLineRepository.findByRepairId(repair.getId());
        List<RepairLine> exportLines = lines.stream()
                .filter(l -> "ADD".equals(l.getActionType()) || "REPLACE".equals(l.getActionType()))
                .toList();
        
        Map<Long, BigDecimal> shortfall = new java.util.HashMap<>();
        if (!exportLines.isEmpty()) {
            Map<Long, BigDecimal> requiredByVariant = exportLines.stream().collect(Collectors.groupingBy(
                    RepairLine::getComponentVariantId, TreeMap::new,
                    Collectors.reducing(BigDecimal.ZERO, RepairLine::getQuantity, BigDecimal::add)));
            for (Map.Entry<Long, BigDecimal> required : requiredByVariant.entrySet()) {
                BigDecimal missing = reserve(repair, required.getKey(), required.getValue());
                if (missing.compareTo(BigDecimal.ZERO) > 0) {
                    shortfall.put(required.getKey(), missing);
                }
            }
        }
        return shortfall;
    }

    @Transactional
    public RepairResponse cancel(Long repairId, String reason) {
        requireAnyRole("ROLE_ACCOUNTANT", "ROLE_SUPER_ADMIN", "ROLE_MANAGER");
        Repair repair = lockRepair(repairId);
        String normalizedReason = requireText(reason, "Lý do hủy là bắt buộc");
        List<InventoryDocument> documents = inventoryDocumentRepository.findByReferenceWithLines(REPAIR, repairId);
        if (documents.stream().anyMatch(doc -> DocumentStatus.POSTED.name().equals(doc.getStatus()))) {
            throw new BusinessException("Lệnh đã có chứng từ kho ghi sổ; phải unpost hợp lệ trước khi hủy");
        }
        documents.stream().filter(doc -> !DocumentStatus.CANCELLED.name().equals(doc.getStatus()))
                .forEach(doc -> doc.updateStatus(DocumentStatus.CANCELLED.name()));
        inventoryDocumentRepository.saveAll(documents);
        releaseReservations(repairId);
        repair.cancel(currentUserId(), normalizedReason);
        repairRepository.save(repair);
        audit(repair, "CANCEL", normalizedReason);
        return detail(repair);
    }

    @Transactional
    public RepairResponse cancelPartsExport(Long repairId, String reason) {
        Repair repair = lockRepair(repairId);
        if (!RepairStatus.APPROVED.name().equals(repair.getRepairStatus())) throw invalidTransition();
        repairInventorySyncService.requireWarehouseAccess(repair.getWarehouseId());
        InventoryDocument document = inventoryDocumentRepository
                .findByReferenceTypeAndReferenceIdAndIssuePurpose(REPAIR, repairId,
                        "REPAIR")
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu xuất linh kiện"));
        if (!DocumentStatus.DRAFT.name().equals(document.getStatus())) {
            throw new BusinessException("Chỉ được hủy phiếu xuất đang ở trạng thái DRAFT");
        }
        String normalizedReason = requireText(reason, "Lý do hủy phiếu xuất là bắt buộc");
        document.updateStatus(DocumentStatus.CANCELLED.name());
        document.setNote((document.getNote() == null ? "" : document.getNote() + " - ")
                + "Hủy: " + normalizedReason);
        inventoryDocumentRepository.save(document);
        releaseReservations(repairId);
        // Do not rollback status to QUOTATION_PENDING here, keep it APPROVED or just handle appropriately.
        // Actually since we don't have returnToWaitingConfirm anymore, we can just leave it as APPROVED and let them re-approve?
        // Wait, if it's APPROVED and they cancel parts export, it stays APPROVED but without parts export.
        // The user might need to decline or re-approve. We'll just leave it as APPROVED for now.
        repairRepository.save(repair);
        audit(repair, "CANCEL_PARTS_EXPORT", normalizedReason);
        return detail(repair);
    }

    @Transactional(readOnly = true)
    public List<InventoryDocumentResponse> getDocuments(Long repairId) {
        repairRepository.findById(repairId).orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));
        return inventoryDocumentRepository.findByReferenceWithLines(REPAIR, repairId).stream()
                .map(doc -> "EX_SO".equals(doc.getDocType())
                        ? inventoryDocumentService.getExportDetail(doc.getId())
                        : inventoryDocumentService.getImportDetail(doc.getId()))
                .toList();
    }

    @Transactional
    public PaymentResponse createPayment(Long repairId, RepairPaymentRequest request) {
        requireAnyRole("ROLE_ACCOUNTANT", "ROLE_SUPER_ADMIN", "ROLE_MANAGER");
        Repair repair = lockRepair(repairId);
        if (!RepairStatus.CLOSED.name().equals(repair.getRepairStatus()) && !RepairStatus.READY_FOR_DELIVERY.name().equals(repair.getRepairStatus())) throw invalidTransition();
        if (repair.getCustomerPayAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Lệnh không phát sinh khoản thu khách hàng");
        }
        return paymentService.createRepairReceipt(repair.getId(), repair.getPartnerId(),
                repair.getCustomerPayAmount(), request.getPaymentMethod(), request.getIdempotencyKey(), currentUserId());
    }

    @Transactional
    public RepairResponse returnDevice(Long repairId, RepairReturnRequest request) {
        requireAnyRole("ROLE_ACCOUNTANT", "ROLE_SUPER_ADMIN", "ROLE_MANAGER");
        Repair repair = lockRepair(repairId);
        repair.markReturned(currentUserId(), "BG-" + repair.getRepairCode(),
                requireText(request.getRecipientName(), "Tên người nhận là bắt buộc"),
                requireText(request.getRecipientPhone(), "Số điện thoại người nhận là bắt buộc"),
                trimToNull(request.getNote()));
        repairRepository.save(repair);
        audit(repair, "RETURN_DEVICE", "Bàn giao thiết bị");
        return detail(repair);
    }

    private void validateSubmit(Repair repair) {
        if (repair.getPartnerId() == null || repair.getAssignedTechnicianId() == null
                || repair.getWarehouseId() == null) {
            throw new BusinessException("Lệnh chưa đủ khách hàng, kho và KTV");
        }
        User technician = userRepository.findById(repair.getAssignedTechnicianId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy kỹ thuật viên"));
        if (!DocumentStatus.APPROVED.name().equalsIgnoreCase(technician.getStatus())
                || technician.getRoles().stream().noneMatch(role -> "ROLE_TECHNICIAN".equals(role.getCode()))) {
            throw new BusinessException("Người được phân công phải là kỹ thuật viên đang hoạt động");
        }
        if (repair.getSerialNumberId() != null
                && repairRepository.existsActiveBySerialNumberId(repair.getSerialNumberId(), repair.getId())) {
            throw new BusinessException("Thiết bị đang có lệnh sửa chữa hoạt động khác");
        }
    }

    private BigDecimal reserve(Repair repair, Long variantId, BigDecimal quantity) {
        inventoryBalanceRepository.findAllByWarehouseAndVariantForUpdate(repair.getWarehouseId(), variantId);
        stockReservationRepository.findActiveByVariantAndWarehouseForUpdate(
                variantId, repair.getWarehouseId(), StockReservationStatus.HOLDING.name());
        BigDecimal available = inventoryBalanceRepository.sumAvailableQuantityByWarehouseAndVariant(
                repair.getWarehouseId(), variantId, GOOD);
                
        BigDecimal actualAvailable = available == null ? BigDecimal.ZERO : available;
        BigDecimal toReserve = quantity.min(actualAvailable);
        BigDecimal missing = quantity.subtract(toReserve);
        String status = missing.compareTo(BigDecimal.ZERO) > 0 ? StockReservationStatus.BACKORDERED.name() : StockReservationStatus.HOLDING.name();

        StockReservation reservation = stockReservationRepository
                .findByRepairIdAndVariantIdAndWarehouseId(repair.getId(), variantId, repair.getWarehouseId())
                .orElseGet(StockReservation::new);
        if (reservation.getId() == null) {
            reservation.initRepairReservation(repair.getId(), variantId, repair.getWarehouseId(), quantity,
                    status, LocalDateTime.now().plusHours(24));
            stockReservationRepository.save(reservation);
            
            if (toReserve.compareTo(BigDecimal.ZERO) > 0) {
                InventoryBalance balance = inventoryBalanceRepository
                        .findByWarehouseAndVariantForUpdate(repair.getWarehouseId(), variantId, GOOD)
                        .orElseGet(() -> {
                            InventoryBalance created = new InventoryBalance();
                            created.initBalance(repair.getWarehouseId(), variantId, null, GOOD,
                                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
                            return inventoryBalanceRepository.save(created);
                        });
                balance.setQuantityReserved(balance.getQuantityReserved().add(toReserve));
                inventoryBalanceRepository.save(balance);
            }
            
            auditLogService.logEvent(currentUsername(), "RESERVE", "Repair", repair.getId(), "SUCCESS",
                    "Giữ " + toReserve + " / Cần " + quantity + " SKU " + variantId + " tại kho " + repair.getWarehouseId(), null, null);
        }
        return missing;
    }

    private void validateRemoval(RepairRemovalRequest removal) {
        ProductVariant variant = productVariantRepository.findById(removal.getVariantId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy SKU linh kiện tháo ra"));
        boolean serialTracked = variant.getProduct() != null && Boolean.TRUE.equals(variant.getProduct().getTrackSerial());
        if (serialTracked && removal.getQuantity().stripTrailingZeros().scale() > 0) {
            throw new BusinessException("Số lượng linh kiện quản lý serial phải là số nguyên");
        }
        if (serialTracked && removal.getSerialNumberId() == null) {
            throw new BusinessException("Linh kiện quản lý serial phải khai báo serial tháo ra");
        }
        if (removal.getSerialNumberId() != null) {
            SerialNumber serial = serialNumberRepository.findById(removal.getSerialNumberId())
                    .orElseThrow(() -> new BusinessException("Không tìm thấy serial linh kiện tháo ra"));
            if (!removal.getVariantId().equals(serial.getVariantId())) {
                throw new BusinessException("Serial tháo ra không thuộc SKU đã khai báo");
            }
        }
    }

    private void releaseReservations(Long repairId) {
        for (StockReservation reservation : stockReservationRepository
                .findByRepairIdAndStatus(repairId, StockReservationStatus.HOLDING.name())) {
            inventoryBalanceRepository.decrementReservedQuantity(reservation.getWarehouseId(),
                    reservation.getVariantId(), reservation.getQuantityReserved());
            reservation.setStatus(StockReservationStatus.RELEASED.name());
            stockReservationRepository.save(reservation);
            auditLogService.logEvent(currentUsername(), "RELEASE_RESERVATION", "Repair", repairId, "SUCCESS",
                    "Giải phóng " + reservation.getQuantityReserved() + " SKU " + reservation.getVariantId(), null, null);
        }
    }

    private Repair lockRepair(Long id) {
        return repairRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));
    }

    private void requireAssignedTechnician(Repair repair) {
        Long actorId = currentUserId();
        if (hasAnyRole("ROLE_SUPER_ADMIN", "ROLE_MANAGER")) return;
        if (!hasRole("ROLE_TECHNICIAN") || !actorId.equals(repair.getAssignedTechnicianId())) {
            throw new BusinessException("Chỉ kỹ thuật viên được phân công mới được thực hiện thao tác này");
        }
    }

    private String normalizeOutcome(String value) {
        String outcome = requireText(value, "Kết quả sửa chữa là bắt buộc").toUpperCase();
        try { return RepairOutcome.valueOf(outcome).name(); }
        catch (IllegalArgumentException ex) { throw new BusinessException("Kết quả sửa chữa không hợp lệ"); }
    }

    private RepairResponse detail(Repair repair) {
        return repairService.toDetailResponse(repairRepository.findWithDetailsById(repair.getId()).orElse(repair));
    }

    private BusinessException invalidTransition() {
        return new BusinessException(SystemMessage.REP_INVALID_STATUS_TRANSITION);
    }

    private void audit(Repair repair, String action, String description) {
        auditLogService.logEvent(currentUsername(), action, "Repair", repair.getId(), "SUCCESS",
                repair.getRepairCode() + ": " + description, null, null);
    }

    private void notifyCompleted(Repair repair) {
        notifyAfterCommit(null, repair.getCreatedBy(), "Hoàn tất sửa chữa: " + repair.getRepairCode(),
                "Lệnh đã hoàn tất kỹ thuật và kho", repair.getId());
    }

    private void recordRepairDebt(Repair repair) {
        if (repair.getCustomerPayAmount().compareTo(BigDecimal.ZERO) <= 0
                || partnerLedgerRepository.findTopByEntityTypeAndEntityIdOrderByIdDesc("REPAIR", repair.getId()).isPresent()) {
            return;
        }
        partnerLedgerService.recordLedger(repair.getPartnerId(), "REPAIR", repair.getId(), repair.getRepairCode(),
                repair.getCustomerPayAmount(), BigDecimal.ZERO,
                "Ghi nhận phải thu từ lệnh sửa chữa " + repair.getRepairCode());
    }

    private void notifyAfterCommit(String role, Long userId, String title, String message, Long repairId) {
        Runnable send = () -> {
            try {
                notificationService.createNotification(role, userId, title, message,
                        "REPAIR", "REPAIR", repairId, "/repairs/" + repairId + "/edit");
            } catch (RuntimeException ignored) { }
        };
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            send.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { send.run(); }
        });
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) throw new BusinessException("Không xác định được người dùng hiện tại");
        return userRepository.findByUsername(authentication.getName()).map(User::getId)
                .orElseThrow(() -> new BusinessException("Không xác định được người dùng hiện tại"));
    }

    private String currentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null ? authentication.getName() : "system";
    }

    private boolean hasRole(String role) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority).anyMatch(role::equals);
    }

    private boolean hasAnyRole(String... roles) {
        return Arrays.stream(roles).anyMatch(this::hasRole);
    }

    private void requireAnyRole(String... roles) {
        if (!hasAnyRole(roles)) throw new BusinessException("Bạn không có quyền thực hiện thao tác này");
    }

    private String requireText(String value, String message) {
        String normalized = trimToNull(value);
        if (normalized == null) throw new BusinessException(message);
        return normalized;
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
