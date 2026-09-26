package com.duylongtech.backend.feature.stocktake;

import com.duylongtech.backend.enums.DocumentStatus;
import com.duylongtech.backend.enums.SerialNumberStatus;
import com.duylongtech.backend.enums.StocktakeStatus;
import com.duylongtech.backend.feature.notification.AppNotificationService;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.feature.stocktake.StocktakeLineRequest;
import com.duylongtech.backend.feature.stocktake.StocktakeRequest;
import com.duylongtech.backend.feature.stocktake.StocktakeResponse;
import com.duylongtech.backend.feature.stocktake.StocktakeLineResponse;
import com.duylongtech.backend.feature.stocktake.StocktakeLineSerialResponse;
import com.duylongtech.backend.feature.stocktake.StocktakeParticipantResponse;

import com.duylongtech.backend.exception.BusinessException;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentService;
import com.duylongtech.backend.feature.inventory.StocktakeAdjustmentGuard;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.SerialNumber;
import com.duylongtech.backend.feature.product.SerialNumberRepository;
import com.duylongtech.backend.feature.stocktake.Stocktake;
import com.duylongtech.backend.feature.stocktake.StocktakeLine;
import com.duylongtech.backend.feature.stocktake.StocktakeLineRequest;
import com.duylongtech.backend.feature.stocktake.StocktakeLineResponse;
import com.duylongtech.backend.feature.stocktake.StocktakeLineSerial;
import com.duylongtech.backend.feature.stocktake.StocktakeLineSerialResponse;
import com.duylongtech.backend.feature.stocktake.StocktakeMapper;
import com.duylongtech.backend.feature.stocktake.StocktakeParticipant;
import com.duylongtech.backend.feature.stocktake.StocktakeParticipantResponse;
import com.duylongtech.backend.feature.stocktake.StocktakeRepository;
import com.duylongtech.backend.feature.stocktake.StocktakeRequest;
import com.duylongtech.backend.feature.stocktake.StocktakeResponse;
import com.duylongtech.backend.feature.stocktake.StocktakeService;
import com.duylongtech.backend.feature.system.CodeGeneratorService;
import com.duylongtech.backend.feature.warehouse.UserWarehouseRole;
import com.duylongtech.backend.feature.warehouse.UserWarehouseRoleRepository;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;

@Service
@RequiredArgsConstructor
public class StocktakeService {

    private final StocktakeRepository stocktakeRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final com.duylongtech.backend.feature.stocktake.StocktakeMapper stocktakeMapper;
    private final CodeGeneratorService codeGeneratorService;
    private final ProductVariantRepository productVariantRepository;
    private final WarehouseRepository warehouseRepository;
    private final InventoryDocumentService inventoryDocumentService;
    private final SerialNumberRepository serialNumberRepository;
    private final com.duylongtech.backend.feature.auth.UserRepository userRepository;
    private final AppNotificationService appNotificationService;
    private final com.duylongtech.backend.feature.inventory.InventoryDocumentRepository inventoryDocumentRepository;
    private final com.duylongtech.backend.feature.audit.AuditLogService auditLogService;

    @Autowired(required = false)
    private UserWarehouseRoleRepository userWarehouseRoleRepository;

    @Transactional(readOnly = true)
    public String generateNextStocktakeCode() {
        return codeGeneratorService.generateCode("stocktakes", "stocktake_code", "KK", 6);
    }

    @Transactional(readOnly = true)
    public Page<StocktakeResponse> searchStocktakes(String stocktakeCode, String status, LocalDate fromDate,
            LocalDate toDate, Pageable pageable) {
        return searchStocktakes(stocktakeCode, status, null, fromDate, toDate, pageable, null);
    }

    @Transactional(readOnly = true)
    public Page<StocktakeResponse> searchStocktakes(String stocktakeCode, String status, Long warehouseId,
            LocalDate fromDate, LocalDate toDate, Pageable pageable, com.duylongtech.backend.security.UserDetailsImpl userPrincipal) {
        String normalizedCode = stocktakeCode != null && !stocktakeCode.trim().isEmpty() ? stocktakeCode.trim() : null;
        String normalizedStatus = status != null && !status.trim().isEmpty() ? status.trim() : null;

        List<Long> allowedWarehouseIds = null;

        if (userPrincipal != null && userWarehouseRoleRepository != null) {
            boolean isAdminOrManager = userPrincipal.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority() != null && (
                            a.getAuthority().contains("SUPER_ADMIN") ||
                            a.getAuthority().contains("MANAGER") ||
                            a.getAuthority().contains("ACCOUNTANT")
                    ));

            if (!isAdminOrManager) {
                List<UserWarehouseRole> roles = userWarehouseRoleRepository.findByUserId(userPrincipal.getId());
                List<Long> assignedWarehouseIds = roles.stream()
                        .filter(r -> Boolean.TRUE.equals(r.getIsActive()))
                        .map(UserWarehouseRole::getWarehouseId)
                        .distinct()
                        .toList();

                if (assignedWarehouseIds.isEmpty()) {
                    return Page.empty(pageable);
                }

                if (warehouseId != null) {
                    if (!assignedWarehouseIds.contains(warehouseId)) {
                        return Page.empty(pageable);
                    }
                } else {
                    allowedWarehouseIds = assignedWarehouseIds;
                }
            }
        }

        Page<Stocktake> page = stocktakeRepository.searchStocktakes(normalizedCode, normalizedStatus, fromDate, toDate,
                warehouseId, allowedWarehouseIds, pageable);
        return page.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public StocktakeResponse getStocktakeDetail(Long id) {
        return getStocktakeDetail(id, null);
    }

    @Transactional(readOnly = true)
    public StocktakeResponse getStocktakeDetail(Long id, com.duylongtech.backend.security.UserDetailsImpl userPrincipal) {
        Stocktake stocktake = stocktakeRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu kiểm kê"));

        if (userPrincipal != null && userWarehouseRoleRepository != null) {
            boolean isAdminOrManager = userPrincipal.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority() != null && (
                            a.getAuthority().contains("SUPER_ADMIN") ||
                            a.getAuthority().contains("MANAGER") ||
                            a.getAuthority().contains("ACCOUNTANT")
                    ));

            if (!isAdminOrManager) {
                List<UserWarehouseRole> roles = userWarehouseRoleRepository.findByUserId(userPrincipal.getId());
                boolean hasAccess = roles.stream()
                        .anyMatch(r -> Boolean.TRUE.equals(r.getIsActive()) && r.getWarehouseId().equals(stocktake.getWarehouseId()));
                if (!hasAccess) {
                    throw new BusinessException("Bạn không có quyền truy cập phiếu kiểm kê của kho này");
                }
            }
        }

        return toResponse(stocktake);
    }

    @Transactional(readOnly = true)
    public List<AvailableSerialResponse> getAvailableSerials(Long warehouseId, Long variantId) {
        if (warehouseId == null || variantId == null) {
            return new ArrayList<>();
        }
        return serialNumberRepository.findByWarehouseIdAndVariantIdAndStatus(warehouseId, variantId, SerialNumberStatus.AVAILABLE.name())
                .stream()
                .map(serial -> new AvailableSerialResponse(serial.getId(), serial.getSerialNumber()))
                .toList();
    }

    public StocktakeResponse createStocktake(StocktakeRequest req) {
        return createStocktake(req, null);
    }

    /**
     * Người có quyền duyệt (Manager / Super Admin) tạo phiếu thì vào kiểm kê ngay. Người khác tạo thì phiếu ở
     * PENDING_APPROVAL và manager nhận thông báo có nút Đồng ý / Từ chối. Mỗi kho chỉ có một đợt kiểm kê đang mở.
     */
    @Transactional
    public StocktakeResponse createStocktake(StocktakeRequest req, com.duylongtech.backend.security.UserDetailsImpl userPrincipal) {
        validateRequest(req);
        assertNoOpenStocktake(req.getWarehouseId());
        String docCode = resolveDocCode(req.getStocktakeCode());

        Stocktake stocktake = new Stocktake();
        stocktake.initOrder(docCode, req.getWarehouseId(), req.getPurpose(), req.getStocktakeDate(), req.getCreatedBy());

        mapLinesAndParticipants(stocktake, req);

        boolean autoApprove = isApprover(userPrincipal);
        if (autoApprove) {
            snapshotBookQuantities(stocktake);
            stocktake.startCounting(userPrincipal.getId());
        } else {
            stocktake.submitForApproval();
        }
        Stocktake saved = stocktakeRepository.save(stocktake);

        if (autoApprove) {
            notifyCountingStarted(saved);
            audit(userPrincipal, "START_STOCKTAKE", saved, "Tạo và bắt đầu kiểm kê " + saved.getStocktakeCode() + " - kho bị khóa nhập/xuất/chuyển");
        } else {
            notifyManagersForApproval(saved);
            audit(userPrincipal, "CREATE_STOCKTAKE", saved, "Tạo phiếu kiểm kê " + saved.getStocktakeCode() + " - chờ quản lý duyệt");
        }
        return toResponse(saved);
    }

    /**
     * Phiếu lưu tạm (DRAFT) tạo trước khi có bước duyệt: gửi cho Manager duyệt như phiếu mới. Manager/Super Admin
     * thì bắt đầu kiểm kê ngay. Không có thao tác này thì phiếu cũ không bao giờ tới được tay Manager.
     */
    @Transactional(rollbackFor = Exception.class)
    public StocktakeResponse submitStocktake(Long id, com.duylongtech.backend.security.UserDetailsImpl userPrincipal) {
        Stocktake stocktake = stocktakeRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu kiểm kê"));
        if (!StocktakeStatus.DRAFT.name().equals(stocktake.getStatus())) {
            throw new BusinessException("Chỉ phiếu lưu tạm mới cần gửi duyệt (hiện tại: " + stocktake.getStatus() + ")");
        }
        assertNoOpenStocktake(stocktake.getWarehouseId());

        if (isApprover(userPrincipal)) {
            snapshotBookQuantities(stocktake);
            stocktake.startCounting(userPrincipal.getId());
        } else {
            stocktake.submitForApproval();
        }
        Stocktake saved = stocktakeRepository.save(stocktake);
        if (saved.isCounting()) {
            notifyCountingStarted(saved);
            audit(userPrincipal, "START_STOCKTAKE", saved, "Bắt đầu kiểm kê " + saved.getStocktakeCode() + " (phiếu lưu tạm) - kho bị khóa nhập/xuất/chuyển");
        } else {
            notifyManagersForApproval(saved);
            audit(userPrincipal, "SUBMIT_STOCKTAKE", saved, "Gửi duyệt phiếu kiểm kê " + saved.getStocktakeCode());
        }
        return toResponse(saved);
    }

    /** Manager đồng ý: chốt số sổ sách theo tồn hiện tại và khóa kho. */
    @Transactional(rollbackFor = Exception.class)
    public StocktakeResponse approveStocktake(Long id, com.duylongtech.backend.security.UserDetailsImpl userPrincipal) {
        requireApprover(userPrincipal);
        Stocktake stocktake = lockPending(id);
        assertNoOtherCounting(stocktake);

        snapshotBookQuantities(stocktake);
        stocktake.approve(userPrincipal.getId());
        Stocktake saved = stocktakeRepository.save(stocktake);

        appNotificationService.retypeNotifications("STOCKTAKE", saved.getId(), NOTIFICATION_APPROVAL, NOTIFICATION_DECIDED);
        notifyCountingStarted(saved);
        audit(userPrincipal, "APPROVE_STOCKTAKE", saved, "Duyệt kiểm kê " + saved.getStocktakeCode() + " - kho bị khóa nhập/xuất/chuyển, số sổ sách được chốt");
        return toResponse(saved);
    }

    @Transactional(rollbackFor = Exception.class)
    public StocktakeResponse rejectStocktake(Long id, String reason, com.duylongtech.backend.security.UserDetailsImpl userPrincipal) {
        requireApprover(userPrincipal);
        String trimmed = reason != null ? reason.trim() : "";
        if (trimmed.isEmpty()) {
            throw new BusinessException("Vui lòng nhập lý do từ chối phiếu kiểm kê");
        }
        if (trimmed.length() > 500) {
            throw new BusinessException("Lý do từ chối tối đa 500 ký tự");
        }
        Stocktake stocktake = lockPending(id);

        stocktake.reject(userPrincipal.getId(), trimmed);
        Stocktake saved = stocktakeRepository.save(stocktake);

        appNotificationService.retypeNotifications("STOCKTAKE", saved.getId(), NOTIFICATION_APPROVAL, NOTIFICATION_DECIDED);
        audit(userPrincipal, "REJECT_STOCKTAKE", saved, "Từ chối kiểm kê " + saved.getStocktakeCode() + ". Lý do: " + trimmed);
        if (saved.getCreatedBy() != null) {
            appNotificationService.createNotification(null, saved.getCreatedBy(),
                    "Phiếu kiểm kê " + saved.getStocktakeCode() + " bị từ chối",
                    "Lý do: " + trimmed, NOTIFICATION_RESULT, "STOCKTAKE", saved.getId(),
                    "/stocktakes/" + saved.getId(), null);
        }
        return toResponse(saved);
    }

    /**
     * Hủy phiếu (mở khóa kho nếu đang kiểm kê). Manager / Super Admin hủy được mọi phiếu chưa kết thúc;
     * người tạo chỉ hủy được phiếu của mình khi còn chờ duyệt.
     */
    @Transactional(rollbackFor = Exception.class)
    public StocktakeResponse cancelStocktake(Long id, com.duylongtech.backend.security.UserDetailsImpl userPrincipal) {
        Stocktake stocktake = stocktakeRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu kiểm kê"));

        boolean approver = isApprover(userPrincipal);
        boolean ownPending = userPrincipal != null && StocktakeStatus.PENDING_APPROVAL.name().equals(stocktake.getStatus())
                && userPrincipal.getId() != null && userPrincipal.getId().equals(stocktake.getCreatedBy());
        if (!approver && !ownPending) {
            throw new BusinessException("Chỉ Manager mới được hủy phiếu kiểm kê, hoặc người tạo hủy phiếu của mình khi đang chờ duyệt");
        }

        boolean wasCounting = stocktake.isCounting();
        try {
            stocktake.cancel();
        } catch (IllegalStateException e) {
            throw new BusinessException(e.getMessage());
        }
        Stocktake saved = stocktakeRepository.save(stocktake);

        appNotificationService.retypeNotifications("STOCKTAKE", saved.getId(), NOTIFICATION_APPROVAL, NOTIFICATION_DECIDED);
        audit(userPrincipal, "CANCEL_STOCKTAKE", saved, "Hủy phiếu kiểm kê " + saved.getStocktakeCode() + (wasCounting ? " - kho được mở khóa" : ""));
        if (wasCounting && saved.getWarehouseId() != null) {
            appNotificationService.createNotification("ROLE_WAREHOUSE_CONTROLLER", null,
                    "Đã hủy kiểm kê " + saved.getStocktakeCode(),
                    "Kho đã được mở khóa, có thể nhập/xuất/chuyển kho trở lại.", NOTIFICATION_RESULT, "STOCKTAKE",
                    saved.getId(), "/stocktakes/" + saved.getId(), saved.getWarehouseId());
        }
        return toResponse(saved);
    }

    @Transactional
    public StocktakeResponse updateStocktake(Long id, StocktakeRequest req, com.duylongtech.backend.security.UserDetailsImpl userPrincipal) {
        validateRequest(req);
        Stocktake stocktake = stocktakeRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu kiểm kê"));

        if (!stocktake.isEditable()) {
            throw new BusinessException(StocktakeStatus.PENDING_APPROVAL.name().equals(stocktake.getStatus())
                    ? "Phiếu kiểm kê đang chờ manager duyệt, chưa thể nhập số đếm"
                    : SystemMessage.INV_ERR_014.getMessage());
        }
        boolean counting = stocktake.isCounting();
        String signatureBefore = countSignature(stocktake);
        java.util.Map<Long, java.math.BigDecimal> frozenBook = new java.util.HashMap<>();
        if (counting) {
            stocktake.getLines().forEach(l -> frozenBook.put(l.getVariantId(), l.getBookQty()));
        }

        String requestedCode = req.getStocktakeCode() != null ? req.getStocktakeCode().trim() : null;
        if (requestedCode != null && !requestedCode.equals(stocktake.getStocktakeCode())) {
            if (stocktakeRepository.existsByStocktakeCode(requestedCode)) {
                throw new BusinessException(SystemMessage.STK_ERR_006.getMessage());
            }
            // Cannot change code in RDM easily if it's hidden. Ignore for now.
        }
        stocktake.updateDetails(req.getPurpose(), req.getStocktakeDate());

        stocktake.clearLines();
        stocktake.clearParticipants();

        mapLinesAndParticipants(stocktake, req);

        if (counting) {
            // Số sổ sách đã chốt lúc bắt đầu kiểm kê: client không được đổi; dòng thêm mới thì chốt theo tồn hiện tại.
            for (StocktakeLine line : stocktake.getLines()) {
                if (frozenBook.containsKey(line.getVariantId())) {
                    line.overrideBookQty(frozenBook.get(line.getVariantId()));
                } else {
                    line.rebaseBookQty(currentOnHand(stocktake.getWarehouseId(), line.getVariantId()));
                }
            }
        }

        // Dòng lệch chọn "Không xử lý" phải có lý do; mọi thay đổi số đếm/lý do làm mất xác nhận cũ.
        validateSkippedLines(stocktake);
        if (!signatureBefore.equals(countSignature(stocktake))) {
            stocktake.clearWaiverConfirmation();
            if (userPrincipal != null) {
                stocktake.setLastCountedBy(userPrincipal.getId());
            }
        }

        return toResponse(stocktakeRepository.save(stocktake));
    }

    @Transactional(rollbackFor = Exception.class)
    public StocktakeResponse postStocktake(Long id, com.duylongtech.backend.security.UserDetailsImpl userPrincipal) {
        Stocktake stocktake = stocktakeRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu kiểm kê"));

        if (!stocktake.isEditable()) {
            throw new BusinessException(StocktakeStatus.PENDING_APPROVAL.name().equals(stocktake.getStatus())
                    ? "Phiếu kiểm kê chưa được manager duyệt"
                    : SystemMessage.STK_ERR_005.getMessage());
        }
        assertReadyToComplete(stocktake);

        for (StocktakeLine line : stocktake.getLines()) {
            // Dòng lệch được bỏ qua: không đụng tới trạng thái serial
            if (line.isSkippedDiff()) {
                continue;
            }
            // Process serial updates if available
            if (line.getSerials() != null && !line.getSerials().isEmpty()) {
                for (StocktakeLineSerial sLine : line.getSerials()) {
                    if ("MISSING".equals(sLine.getScanStatus())) {
                        if (sLine.getSerialNumberId() != null) {
                            serialNumberRepository.findById(sLine.getSerialNumberId()).ifPresent(sn -> {
                                sn.updateStatus(SerialNumberStatus.LOST.name());
                                serialNumberRepository.save(sn);
                            });
                        }
                    } else if ("UNEXPECTED".equals(sLine.getScanStatus())) {
                        Optional<SerialNumber> existingOpt = serialNumberRepository
                                .findByVariantIdAndSerialNumber(line.getVariantId(), sLine.getSerialNumber());
                        if (existingOpt.isPresent()) {
                            SerialNumber sn = existingOpt.get();
                            sn.updateWarehouse(stocktake.getWarehouseId());
                            sn.updateStatus(SerialNumberStatus.AVAILABLE.name());
                            serialNumberRepository.save(sn);
                        } else {
                            SerialNumber newSn = new SerialNumber();
                            newSn.initSerialNumber(line.getVariantId(), stocktake.getWarehouseId(), sLine.getSerialNumber(), SerialNumberStatus.AVAILABLE.name(), LocalDateTime.now());
                            serialNumberRepository.save(newSn);
                        }
                    }
                }
            }
        }

        stocktake.markAsPosted();
        Stocktake completed = stocktakeRepository.save(stocktake);
        audit(userPrincipal, "COMPLETE_STOCKTAKE", completed, "Hoàn thành kiểm kê " + completed.getStocktakeCode() + " - kho được mở khóa");
        return toResponse(completed);
    }

    private void validateRequest(StocktakeRequest req) {
        if (req == null)
            throw new BusinessException(SystemMessage.STK_ERR_004.getMessage());
        if (req.getWarehouseId() == null)
            throw new BusinessException(SystemMessage.STK_ERR_003.getMessage());
        if (req.getLines() == null || req.getLines().isEmpty())
            throw new BusinessException(SystemMessage.STK_ERR_002.getMessage());
        if (req.getCreatedBy() == null)
            throw new BusinessException(SystemMessage.ASM_ERR_026.getMessage());

        Set<Long> seenVariants = new HashSet<>();
        for (StocktakeLineRequest line : req.getLines()) {
            if (line.getVariantId() == null) {
                throw new BusinessException(SystemMessage.STK_ERR_008.getMessage());
            }
            if (!seenVariants.add(line.getVariantId())) {
                throw new BusinessException(SystemMessage.STK_ERR_007.getMessage());
            }
        }
    }

    private String resolveDocCode(String requestedCode) {
        String docCode = requestedCode != null && !requestedCode.trim().isEmpty() ? requestedCode.trim() : null;
        if (docCode == null) {
            docCode = codeGeneratorService.generateCode("stocktakes", "stocktake_code", "KK", 6);
        }
        if (stocktakeRepository.existsByStocktakeCode(docCode)) {
            throw new BusinessException(String.format(SystemMessage.STK_ERR_001.getMessage(), docCode));
        }
        return docCode;
    }

    private void mapLinesAndParticipants(Stocktake stocktake, StocktakeRequest req) {
        if (req.getLines() != null) {
            req.getLines().forEach(lineReq -> {
                // Đếm thực tế không thể âm; chặn ở đây vì màn hình không phải nguồn duy nhất gọi API.
                if (lineReq.getCountQty() != null && lineReq.getCountQty().signum() < 0) {
                    throw new BusinessException("Số lượng kiểm kê thực tế không được âm");
                }
                StocktakeLine line = new StocktakeLine();
                line.initLine(lineReq.getVariantId(), lineReq.getBookQty(), lineReq.getCountQty(), lineReq.getGoodQty(), lineReq.getBadQty(), lineReq.getLostQty(), lineReq.getAction());
                line.updateSkipReason(lineReq.getSkipReason());
                stocktake.addLine(line);

                if (lineReq.getSerials() != null && !lineReq.getSerials().isEmpty()) {
                    lineReq.getSerials().forEach(sReq -> {
                        StocktakeLineSerial serial = new StocktakeLineSerial();
                        serial.initSerial(sReq.getSerialNumberId(), sReq.getSerialNumber(), sReq.getScanStatus(), sReq.getNote());
                        line.addSerial(serial);
                    });
                }
            });
        }
        if (req.getParticipants() != null) {
            req.getParticipants().forEach(partReq -> {
                StocktakeParticipant participant = new StocktakeParticipant();
                participant.initParticipant(partReq.getFullName(), partReq.getTitle(), partReq.getRepresent());
                stocktake.addParticipant(participant);
            });
        }
    }

    private StocktakeResponse toResponse(Stocktake entity) {
        StocktakeResponse response = stocktakeMapper.toResponse(entity);
        if (response != null && entity.getLines() != null) {
            response.setSkippedDiffCount(entity.skippedDiffLines().size());
            response.setParticipantCount(entity.participantCount());
            java.util.Map<Long, String> names = userNames(entity.getCreatedBy(), entity.getApprovedBy(), entity.getWaiverConfirmedBy(), entity.getLastCountedBy());
            response.setCreatedByName(names.get(entity.getCreatedBy()));
            response.setApprovedByName(names.get(entity.getApprovedBy()));
            response.setWaiverConfirmedByName(names.get(entity.getWaiverConfirmedBy()));
            response.setLastCountedByName(names.get(entity.getLastCountedBy()));
            response.setWaiverConfirmed(entity.getWaiverConfirmedAt() != null && !entity.skippedDiffLines().isEmpty());
            response.setNeedsImportAdjustment(entity.requiresImportAdjustment());
            response.setNeedsExportAdjustment(entity.requiresExportAdjustment());
            StocktakeAdjustmentGuard adjustments = stocktakeAdjustments();
            response.setImportAdjustmentPosted(adjustments.hasPostedAdjustment(entity.getId(), StocktakeAdjustmentGuard.IMPORT_DOC_TYPE));
            response.setExportAdjustmentPosted(adjustments.hasPostedAdjustment(entity.getId(), StocktakeAdjustmentGuard.EXPORT_DOC_TYPE));
            adjustments.activeAdjustment(entity.getId(), StocktakeAdjustmentGuard.IMPORT_DOC_TYPE, null).ifPresent(doc -> {
                response.setImportAdjustmentId(doc.getId());
                response.setImportAdjustmentCode(doc.getDocCode());
                response.setImportAdjustmentStatus(doc.getStatus());
            });
            adjustments.activeAdjustment(entity.getId(), StocktakeAdjustmentGuard.EXPORT_DOC_TYPE, null).ifPresent(doc -> {
                response.setExportAdjustmentId(doc.getId());
                response.setExportAdjustmentCode(doc.getDocCode());
                response.setExportAdjustmentStatus(doc.getStatus());
            });
        }
        
        if (entity.getCreatedBy() != null) {
            userRepository.findById(entity.getCreatedBy()).ifPresent(user -> {
                boolean isAccountant = user.getRoles().stream()
                        .anyMatch(r -> "ACCOUNTANT".equals(r.getName()) || "ROLE_ACCOUNTANT".equals(r.getName()));
                response.setCreatedByAccountant(isAccountant);
            });
        }

        if (entity.getWarehouseId() != null) {
            warehouseRepository.findById(entity.getWarehouseId())
                    .ifPresent(w -> response.setWarehouseName(w.getName()));
        }

        if (entity.getLines() != null) {
            List<StocktakeLineResponse> lineResponses = entity.getLines().stream().map(line -> {
                StocktakeLineResponse lineResp = stocktakeMapper.toLineResponse(line);
                ProductVariant variant = productVariantRepository.findById(line.getVariantId()).orElse(null);
                Product product = variant != null ? variant.getProduct() : null;

                if (line.getSerials() != null) {
                    lineResp.setSerials(line.getSerials().stream()
                            .map(stocktakeMapper::toSerialResponse)
                            .collect(Collectors.toList()));
                }

                Boolean trackSerial = (product != null && Boolean.TRUE.equals(product.getTrackSerial()));
                
                lineResp.setItemCode(product != null ? product.getProductCode() : (variant != null ? "VT-" + variant.getId() : null));
                lineResp.setSku(variant != null ? variant.getSku() : null);
                lineResp.setItemName(product != null
                        ? product.getProductName() + (variant.getVariantName() != null ? " (" + variant.getVariantName() + ")" : "")
                        : null);
                lineResp.setUnit(product != null && product.getUnit() != null ? product.getUnit().getName() : null);
                lineResp.setTrackSerial(trackSerial);
                return lineResp;
            }).collect(Collectors.toList());
            response.setLines(lineResponses);
        }

        if (entity.getParticipants() != null) {
            response.setParticipants(entity.getParticipants().stream()
                    .map(stocktakeMapper::toParticipantResponse)
                    .collect(Collectors.toList()));
        }

        return response;
    }

    // ---------------------------------------------------------------------
    // Duyệt kiểm kê & khóa kho
    // ---------------------------------------------------------------------

    private static final String NOTIFICATION_APPROVAL = "STOCKTAKE_APPROVAL";
    private static final String NOTIFICATION_DECIDED = "STOCKTAKE_DECIDED";
    private static final String NOTIFICATION_WAIVER = "STOCKTAKE_WAIVER";
    private static final String NOTIFICATION_RESULT = "STOCKTAKE";
    private static final java.util.List<String> OPEN_STATUSES = java.util.List.of(
            StocktakeStatus.PENDING_APPROVAL.name(), StocktakeStatus.COUNTING.name());

    static boolean isApprover(com.duylongtech.backend.security.UserDetailsImpl principal) {
        return principal != null && principal.getAuthorities().stream()
                .anyMatch(a -> "ROLE_MANAGER".equals(a.getAuthority()) || "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
    }

    private void requireApprover(com.duylongtech.backend.security.UserDetailsImpl principal) {
        if (!isApprover(principal)) {
            throw new BusinessException("Chỉ Manager mới được duyệt hoặc từ chối phiếu kiểm kê");
        }
    }

    /** Khóa dòng phiếu để hai manager bấm cùng lúc không cùng duyệt; báo rõ nếu phiếu đã được xử lý. */
    private Stocktake lockPending(Long id) {
        Stocktake stocktake = stocktakeRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu kiểm kê"));
        if (!StocktakeStatus.PENDING_APPROVAL.name().equals(stocktake.getStatus())) {
            throw new BusinessException("Phiếu kiểm kê " + stocktake.getStocktakeCode()
                    + " không còn ở trạng thái chờ duyệt (hiện tại: " + stocktake.getStatus() + ")");
        }
        return stocktake;
    }

    private void assertNoOpenStocktake(Long warehouseId) {
        if (stocktakeRepository.existsByWarehouseIdAndStatusIn(warehouseId, OPEN_STATUSES)) {
            throw new BusinessException("Kho này đang có một đợt kiểm kê chưa kết thúc (chờ duyệt hoặc đang kiểm kê). "
                    + "Hoàn tất hoặc hủy đợt đó trước khi tạo phiếu mới.");
        }
    }

    private void assertNoOtherCounting(Stocktake stocktake) {
        stocktakeRepository.findFirstByWarehouseIdAndStatus(stocktake.getWarehouseId(), StocktakeStatus.COUNTING.name())
                .filter(other -> !other.getId().equals(stocktake.getId()))
                .ifPresent(other -> {
                    throw new BusinessException("Kho đang được kiểm kê bởi phiếu " + other.getStocktakeCode()
                            + ". Hoàn tất hoặc hủy phiếu đó trước.");
                });
    }

    /** Chốt số sổ sách của mọi dòng theo tồn thực tế của kho ngay lúc bắt đầu kiểm kê. */
    private void snapshotBookQuantities(Stocktake stocktake) {
        for (StocktakeLine line : stocktake.getLines()) {
            // Dòng có serial: danh sách serial do người dùng quét, không tự đổi theo tồn.
            if (line.getSerials() != null && !line.getSerials().isEmpty()) {
                continue;
            }
            line.rebaseBookQty(currentOnHand(stocktake.getWarehouseId(), line.getVariantId()));
        }
    }

    private java.math.BigDecimal currentOnHand(Long warehouseId, Long variantId) {
        return inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(warehouseId, variantId, "GOOD")
                .map(com.duylongtech.backend.feature.inventory.InventoryBalance::getQuantityOnHand)
                .orElse(java.math.BigDecimal.ZERO);
    }

    /**
     * Phiếu chỉ hoàn thành khi mọi dòng lệch đã được xử lý: hoặc có phiếu nhập/xuất điều chỉnh ĐÃ GHI SỔ,
     * hoặc được chọn "Không xử lý" kèm lý do và được Manager/Kế toán xác nhận. Trả về null nếu đã sẵn sàng.
     */
    private String readinessProblem(Stocktake stocktake) {
        if (!stocktake.hasEnoughParticipants()) {
            return "Cần ghi nhận ít nhất " + Stocktake.MIN_PARTICIPANTS + " thành viên tham gia kiểm kê (họ tên) trước khi hoàn thành.";
        }
        StocktakeAdjustmentGuard adjustments = stocktakeAdjustments();
        if (stocktake.requiresImportAdjustment()
                && !adjustments.hasPostedAdjustment(stocktake.getId(), StocktakeAdjustmentGuard.IMPORT_DOC_TYPE)) {
            return "Còn hàng thừa: cần lập và ghi sổ phiếu nhập điều chỉnh (hoặc chọn \"Không xử lý\" kèm lý do) trước khi hoàn thành kiểm kê.";
        }
        if (stocktake.requiresExportAdjustment()
                && !adjustments.hasPostedAdjustment(stocktake.getId(), StocktakeAdjustmentGuard.EXPORT_DOC_TYPE)) {
            return "Còn hàng thiếu: cần lập và ghi sổ phiếu xuất điều chỉnh (hoặc chọn \"Không xử lý\" kèm lý do) trước khi hoàn thành kiểm kê.";
        }
        if (stocktake.hasUnconfirmedWaivers()) {
            return "Các dòng \"Không xử lý\" chưa được Manager hoặc Kế toán xác nhận. Hãy gửi yêu cầu xác nhận.";
        }
        return null;
    }

    private void assertReadyToComplete(Stocktake stocktake) {
        validateSkippedLines(stocktake);
        String problem = readinessProblem(stocktake);
        if (problem != null) {
            throw new BusinessException(problem);
        }
    }

    /** Phiếu điều chỉnh tìm theo tham chiếu (không chỉ theo id phiếu mới nhất đã lưu trên phiếu kiểm kê). */
    private StocktakeAdjustmentGuard stocktakeAdjustments() {
        return new StocktakeAdjustmentGuard(inventoryDocumentRepository, stocktakeRepository);
    }

    /** Dấu vân tay của số đếm/lựa chọn xử lý: chỉ khi nó đổi thì xác nhận bỏ qua chênh lệch cũ mới mất hiệu lực. */
    private static String countSignature(Stocktake stocktake) {
        return stocktake.getLines().stream()
                .sorted(java.util.Comparator.comparing(StocktakeLine::getVariantId))
                .map(l -> l.getVariantId() + "|" + l.getCountQty() + "|" + l.getAction() + "|" + l.getSkipReason())
                .collect(java.util.stream.Collectors.joining(";"));
    }

    /** Dòng lệch mà chọn "Không xử lý" bắt buộc có lý do (để tra cứu về sau). */
    private void validateSkippedLines(Stocktake stocktake) {
        for (StocktakeLine line : stocktake.skippedDiffLines()) {
            if (line.getSkipReason() == null || line.getSkipReason().isBlank()) {
                String label = productVariantRepository.findById(line.getVariantId())
                        .map(ProductVariant::getSku).orElse("#" + line.getVariantId());
                throw new BusinessException("Sản phẩm " + label + " có chênh lệch nhưng chọn \"Không xử lý\": vui lòng nhập lý do.");
            }
            if (line.getSkipReason().length() > 500) {
                throw new BusinessException("Lý do không xử lý chênh lệch tối đa 500 ký tự.");
            }
        }
    }

    private void audit(com.duylongtech.backend.security.UserDetailsImpl principal, String action, Stocktake stocktake, String description) {
        // logEvent không bao giờ ném lỗi ra ngoài (không làm hỏng nghiệp vụ chính)
        auditLogService.logEvent(principal != null ? principal.getUsername() : null, action, "Stocktake",
                stocktake.getId(), "SUCCESS", description, null, null);
    }

    /** "SKU lệch +2 (lý do); ..." - ghi vào Audit Log để tra cứu về sau. */
    private String describeSkippedLines(Stocktake stocktake) {
        return stocktake.skippedDiffLines().stream()
                .map(l -> productVariantRepository.findById(l.getVariantId()).map(ProductVariant::getSku).orElse("#" + l.getVariantId())
                        + " lệch " + (l.getDiffQty().signum() > 0 ? "+" : "") + l.getDiffQty().stripTrailingZeros().toPlainString()
                        + " (" + l.getSkipReason() + ")")
                .collect(Collectors.joining("; "));
    }

    private java.util.Map<Long, String> userNames(Long... ids) {
        java.util.Set<Long> wanted = new java.util.LinkedHashSet<>();
        for (Long id : ids) {
            if (id != null) wanted.add(id);
        }
        java.util.Map<Long, String> names = new java.util.HashMap<>();
        if (!wanted.isEmpty()) {
            userRepository.findAllById(wanted).forEach(u ->
                    names.put(u.getId(), u.getFullName() != null && !u.getFullName().isBlank() ? u.getFullName() : u.getUsername()));
        }
        return names;
    }

    static boolean isWaiverApprover(com.duylongtech.backend.security.UserDetailsImpl principal) {
        return principal != null && principal.getAuthorities().stream()
                .anyMatch(a -> "ROLE_MANAGER".equals(a.getAuthority()) || "ROLE_SUPER_ADMIN".equals(a.getAuthority())
                        || "ROLE_ACCOUNTANT".equals(a.getAuthority()));
    }

    /** Thủ kho báo cho Manager/Kế toán biết có dòng chênh lệch xin bỏ qua cần xác nhận. */
    @Transactional(rollbackFor = Exception.class)
    public StocktakeResponse requestWaiverConfirmation(Long id, com.duylongtech.backend.security.UserDetailsImpl principal) {
        Stocktake stocktake = stocktakeRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu kiểm kê"));
        if (!stocktake.isCounting()) {
            throw new BusinessException("Chỉ gửi yêu cầu xác nhận khi phiếu đang kiểm kê");
        }
        if (stocktake.skippedDiffLines().isEmpty()) {
            throw new BusinessException("Không có dòng chênh lệch nào chọn \"Không xử lý\"");
        }
        validateSkippedLines(stocktake);
        if (stocktake.getWaiverConfirmedAt() != null) {
            throw new BusinessException("Các dòng bỏ qua đã được xác nhận");
        }
        String message = "Phiếu " + stocktake.getStocktakeCode() + " có " + stocktake.skippedDiffLines().size()
                + " dòng chênh lệch xin bỏ qua (không lập phiếu điều chỉnh). Vui lòng xem lý do và xác nhận.";
        audit(principal, "REQUEST_STOCKTAKE_WAIVER", stocktake, "Gửi yêu cầu xác nhận bỏ qua chênh lệch - phiếu " + stocktake.getStocktakeCode() + ": " + describeSkippedLines(stocktake));
        for (String role : new String[] {"ROLE_MANAGER", "ROLE_ACCOUNTANT"}) {
            appNotificationService.createNotification(role, null, "Xác nhận bỏ qua chênh lệch " + stocktake.getStocktakeCode(),
                    message, NOTIFICATION_WAIVER, "STOCKTAKE", stocktake.getId(), "/stocktakes/" + stocktake.getId(), null);
        }
        return toResponse(stocktake);
    }

    /** Manager/Kế toán xác nhận các dòng bỏ qua; nếu không còn gì chờ thì phiếu hoàn thành và kho mở khóa. */
    @Transactional(rollbackFor = Exception.class)
    public StocktakeResponse confirmWaivers(Long id, com.duylongtech.backend.security.UserDetailsImpl principal) {
        if (!isWaiverApprover(principal)) {
            throw new BusinessException("Chỉ Manager hoặc Kế toán mới được xác nhận bỏ qua chênh lệch");
        }
        Stocktake stocktake = stocktakeRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu kiểm kê"));
        if (!stocktake.isCounting()) {
            throw new BusinessException("Chỉ xác nhận khi phiếu đang kiểm kê");
        }
        if (stocktake.skippedDiffLines().isEmpty()) {
            throw new BusinessException("Không có dòng chênh lệch nào chọn \"Không xử lý\" để xác nhận");
        }
        validateSkippedLines(stocktake);

        // Người vừa nhập số đếm / chọn "Không xử lý" không được tự xác nhận (Super Admin là ngoại lệ để gỡ kẹt).
        boolean superAdmin = principal.getAuthorities().stream().anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
        if (!superAdmin && principal.getId() != null && principal.getId().equals(stocktake.getLastCountedBy())) {
            throw new BusinessException("Bạn là người vừa nhập số đếm / chọn \"Không xử lý\" nên không thể tự xác nhận. "
                    + "Cần Manager hoặc Kế toán khác xác nhận.");
        }

        stocktake.confirmWaivers(principal.getId());
        if (readinessProblem(stocktake) == null) {
            stocktake.markAsPosted();
        }
        Stocktake saved = stocktakeRepository.save(stocktake);
        appNotificationService.retypeNotifications("STOCKTAKE", saved.getId(), NOTIFICATION_WAIVER, NOTIFICATION_DECIDED);
        audit(principal, "CONFIRM_STOCKTAKE_WAIVER", saved, "Xác nhận bỏ qua chênh lệch - phiếu " + saved.getStocktakeCode() + ": " + describeSkippedLines(saved));
        if (saved.getStatus().equals(StocktakeStatus.POSTED.name())) {
            audit(principal, "COMPLETE_STOCKTAKE", saved, "Hoàn thành kiểm kê " + saved.getStocktakeCode() + " - kho được mở khóa");
        }
        return toResponse(saved);
    }

    private void notifyManagersForApproval(Stocktake stocktake) {
        String warehouseName = warehouseRepository.findById(stocktake.getWarehouseId())
                .map(com.duylongtech.backend.feature.warehouse.Warehouse::getName).orElse("#" + stocktake.getWarehouseId());
        appNotificationService.createNotification("ROLE_MANAGER", null,
                "Yêu cầu kiểm kê " + stocktake.getStocktakeCode(),
                "Có đề nghị kiểm kê kho " + warehouseName + ". Đồng ý sẽ khóa nhập/xuất/chuyển kho cho tới khi kiểm kê xong.",
                NOTIFICATION_APPROVAL, "STOCKTAKE", stocktake.getId(), "/stocktakes/" + stocktake.getId(), null);
    }

    private void notifyCountingStarted(Stocktake stocktake) {
        String warehouseName = warehouseRepository.findById(stocktake.getWarehouseId())
                .map(com.duylongtech.backend.feature.warehouse.Warehouse::getName).orElse("#" + stocktake.getWarehouseId());
        appNotificationService.createNotification("ROLE_WAREHOUSE_CONTROLLER", null,
                "Bắt đầu kiểm kê kho " + warehouseName,
                "Phiếu " + stocktake.getStocktakeCode() + " đã được duyệt. Kho bị khóa nhập/xuất/chuyển; vui lòng nhập số đếm.",
                NOTIFICATION_RESULT, "STOCKTAKE", stocktake.getId(), "/stocktakes/" + stocktake.getId(), stocktake.getWarehouseId());
        if (stocktake.getCreatedBy() != null) {
            appNotificationService.createNotification(null, stocktake.getCreatedBy(),
                    "Phiếu kiểm kê " + stocktake.getStocktakeCode() + " đã được duyệt",
                    "Kho " + warehouseName + " đang được kiểm kê.", NOTIFICATION_RESULT, "STOCKTAKE", stocktake.getId(),
                    "/stocktakes/" + stocktake.getId(), null);
        }
    }
}
