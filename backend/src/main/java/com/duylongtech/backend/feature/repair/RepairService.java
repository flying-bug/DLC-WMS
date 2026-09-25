package com.duylongtech.backend.feature.repair;

import com.duylongtech.backend.enums.RepairStatus;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.SerialNumber;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.ProductRepository;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.SerialNumberRepository;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.audit.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryBalance;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import com.duylongtech.backend.feature.system.CodeGeneratorService;

/**
 * Service xử lý CRUD cơ bản cho Lệnh Sửa Chữa (Repair Management).
 * Xử lý logic giá bảo hành: nếu underWarranty=TRUE hoặc isFreeWarranty=TRUE thì unit_price = 0.
 * Workflow (chuyển trạng thái) được xử lý bởi RepairWorkflowService.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RepairService {

    private static final Set<String> EDITABLE_STATUSES = Set.of(RepairStatus.DRAFT.name(), RepairStatus.QUOTATION.name());
    private static final Set<String> VALID_INVOICE_METHODS = Set.of("none", "b4repair", "after_repair");
    private static final Set<String> VALID_ACTION_TYPES = Set.of("ADD", "REPLACE", "REMOVE");

    private final RepairRepository repairRepository;
    private final RepairLineRepository repairLineRepository;
    private final RepairFeeRepository repairFeeRepository;
    private final PartnerRepository partnerRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final SerialNumberRepository serialNumberRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final CodeGeneratorService codeGeneratorService;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final com.duylongtech.backend.feature.repair.RepairMapper repairMapper;

    // =====================================================================
    // READ Operations
    // =====================================================================

    @Transactional(readOnly = true)
    public Page<RepairResponse> getRepairs(String keyword, String status, LocalDate fromDate, LocalDate toDate, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1));
        String normalizedStatus = trimToNull(status) != null ? status.trim().toUpperCase() : null;
        return repairRepository.searchRepairs(trimToNull(keyword), normalizedStatus, fromDate, toDate, pageable)
                .map(this::toSummaryResponse);
    }

    @Transactional(readOnly = true)
    public RepairResponse getRepairById(Long id) {
        Repair repair = repairRepository.findWithDetailsById(id)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));
        return toDetailResponse(repair);
    }

    // =====================================================================
    // CREATE / UPDATE
    // =====================================================================

    @Transactional
    public RepairResponse createRepair(RepairRequest request) {
        validateCreateRequest(request);

        Long currentUserId = resolveCurrentUserId();
        String repairCode = trimToNull(request.getRepairCode()) != null
                ? trimToNull(request.getRepairCode())
                : generateRepairCode();

        Repair repair = new Repair();
        repair.initOrder(
                repairCode,
                request.getPartnerId(),
                request.getProductId(),
                request.getProductVariantId(),
                request.getProductQuantity(),
                trimToNull(request.getProductUnit()),
                request.getWarehouseId(),
                request.getSerialNumberId(),
                request.getWarrantyId(),
                trimToNull(request.getReferenceType()),
                request.getReferenceId(),
                trimToNull(request.getReferenceCode()),
                request.getReceivedDate(),
                request.getExpectedDate(),
                trimToNull(request.getIssueDescription()),
                trimToNull(request.getDiagnosisNote()),
                request.getUnderWarranty(),
                request.getRepairWarrantyEndDate(),
                resolveInvoiceMethod(request.getInvoiceMethod()),
                trimToNull(request.getResponsiblePerson()),
                trimToNull(request.getNote()),
                currentUserId
        );

        Repair saved = repairRepository.save(repair);

        auditLogService.logEvent(
                getCurrentUsername(), "CREATE", "Repair", saved.getId(),
                "SUCCESS", "Tạo lệnh sửa chữa " + repairCode, null, null
        );

        return toDetailResponse(repairRepository.findWithDetailsById(saved.getId()).orElse(saved));
    }

    @Transactional
    public RepairResponse updateRepair(Long id, RepairRequest request) {
        Repair repair = repairRepository.findWithDetailsById(id)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));

        // Chỉ cho phép sửa ở trạng thái DRAFT hoặc QUOTATION
        if (!EDITABLE_STATUSES.contains(repair.getRepairStatus())) {
            throw new BusinessException(SystemMessage.REP_CANNOT_MODIFY);
        }

        repair.updateDetails(
                request.getPartnerId(),
                request.getProductId(),
                request.getProductVariantId(),
                request.getProductQuantity(),
                trimToNull(request.getProductUnit()),
                request.getWarehouseId(),
                request.getSerialNumberId(),
                request.getWarrantyId(),
                trimToNull(request.getReferenceType()),
                request.getReferenceId(),
                trimToNull(request.getReferenceCode()),
                request.getReceivedDate(),
                request.getExpectedDate(),
                trimToNull(request.getIssueDescription()),
                trimToNull(request.getDiagnosisNote()),
                trimToNull(request.getInternalNotes()),
                request.getUnderWarranty(),
                request.getRepairWarrantyEndDate(),
                request.getInvoiceMethod() != null ? resolveInvoiceMethod(request.getInvoiceMethod()) : null,
                trimToNull(request.getResponsiblePerson()),
                trimToNull(request.getNote())
        );
        // repair.applyWarrantyZeroPrice() is already called inside updateDetails if underWarranty changed from false to true.
        // Wait, applyWarrantyZeroPrice in entity needs the lines, which are mapped.
        // We might need to ensure lines are updated.
        // For now, let's keep the logic.


        if (repair.getExpectedDate() != null && repair.getReceivedDate() != null
                && repair.getExpectedDate().isBefore(repair.getReceivedDate())) {
            throw new BusinessException(SystemMessage.REP_ERR_004.getMessage());
        }

        Repair saved = repairRepository.save(repair);

        auditLogService.logEvent(
                getCurrentUsername(), "UPDATE", "Repair", id,
                "SUCCESS", "Cập nhật lệnh sửa chữa " + repair.getRepairCode(), null, null
        );

        return toDetailResponse(repairRepository.findWithDetailsById(saved.getId()).orElse(saved));
    }

    @Transactional
    public RepairResponse updateInternalNotes(Long id, String notes) {
        Repair repair = repairRepository.findWithDetailsById(id)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));

        if (!EDITABLE_STATUSES.contains(repair.getRepairStatus())) {
            throw new BusinessException(SystemMessage.REP_CANNOT_MODIFY);
        }

        repair.updateDetails(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, trimToNull(notes), null, null, null, null, null);
        Repair saved = repairRepository.save(repair);
        return toDetailResponse(saved);
    }

    // =====================================================================
    // REPAIR LINES (Linh kiện)
    // =====================================================================

    @Transactional
    public RepairLineResponse addRepairLine(Long repairId, RepairLineRequest request) {
        Repair repair = repairRepository.findWithDetailsById(repairId)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));

        if (!EDITABLE_STATUSES.contains(repair.getRepairStatus())) {
            throw new BusinessException(SystemMessage.REP_CANNOT_MODIFY);
        }

        validateLineRequest(request);

        // Sử dụng giá trị truyền lên từ request
        boolean isFreeWarranty = Boolean.TRUE.equals(request.getIsFreeWarranty());

        BigDecimal unitPrice = isFreeWarranty ? BigDecimal.ZERO
                : (request.getUnitPrice() != null ? request.getUnitPrice() : BigDecimal.ZERO);

        if (isFreeWarranty && unitPrice.compareTo(BigDecimal.ZERO) != 0) {
            throw new BusinessException(SystemMessage.REP_WARRANTY_PRICE_INVALID);
        }

        RepairLine line = new RepairLine();
        line.setRepair(repair);
        line.initLine(
                request.getComponentVariantId(),
                request.getActionType().toUpperCase(),
                request.getQuantity(),
                unitPrice,
                isFreeWarranty,
                request.getSerialNumberId(),
                request.getSerialNumber(),
                request.getReplacementSerialNumberId(),
                request.getReplacementSerialNumber(),
                request.getVatPercent(),
                trimToNull(request.getNote())
        );
        repair.addLine(line);

        RepairLine saved = repairLineRepository.save(line);
        repair.recalculateTotalAmount();

        return toLineResponse(saved);
    }

    @Transactional
    public RepairLineResponse updateRepairLine(Long repairId, Long lineId, RepairLineRequest request) {
        Repair repair = repairRepository.findWithDetailsById(repairId)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));

        RepairLine line = repairLineRepository.findById(lineId)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_LINE_NOT_FOUND));

        if (!line.getRepair().getId().equals(repairId)) {
            throw new BusinessException(SystemMessage.REP_LINE_NOT_FOUND);
        }

        if (!EDITABLE_STATUSES.contains(repair.getRepairStatus())) {
            throw new BusinessException(SystemMessage.REP_CANNOT_MODIFY);
        }


        if (request.getQuantity() != null && request.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException(SystemMessage.REP_ERR_001.getMessage());
        }
        String normalizedActionType = null;
        if (request.getActionType() != null) {
            normalizedActionType = request.getActionType().toUpperCase();
            if (!VALID_ACTION_TYPES.contains(normalizedActionType)) {
                throw new BusinessException(SystemMessage.REP_ERR_002.getMessage());
            }
        }
        line.updateDetails(
                request.getComponentVariantId(),
                request.getQuantity(),
                normalizedActionType,
                request.getUnitPrice(),
                request.getIsFreeWarranty(),
                request.getVatPercent(),
                trimToNull(request.getNote()),
                request.getSerialNumberId(),
                request.getSerialNumber(),
                request.getReplacementSerialNumberId(),
                request.getReplacementSerialNumber()
        );


        repairLineRepository.save(line);
        repair.recalculateTotalAmount();

        return toLineResponse(line);
    }

    @Transactional
    public void deleteRepairLine(Long repairId, Long lineId) {
        Repair repair = repairRepository.findWithDetailsById(repairId)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));

        if (!EDITABLE_STATUSES.contains(repair.getRepairStatus())) {
            throw new BusinessException(SystemMessage.REP_CANNOT_MODIFY);
        }

        RepairLine line = repairLineRepository.findById(lineId)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_LINE_NOT_FOUND));

        if (!line.getRepair().getId().equals(repairId)) {
            throw new BusinessException(SystemMessage.REP_LINE_NOT_FOUND);
        }

        repair.removeLine(line);
        repairLineRepository.delete(line);
    }

    // =====================================================================
    // REPAIR FEES (Phí dịch vụ)
    // =====================================================================

    @Transactional
    public RepairFeeResponse addRepairFee(Long repairId, RepairFeeRequest request) {
        Repair repair = repairRepository.findWithDetailsById(repairId)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));

        if (!EDITABLE_STATUSES.contains(repair.getRepairStatus())) {
            throw new BusinessException(SystemMessage.REP_CANNOT_MODIFY);
        }

        if (trimToNull(request.getFeeName()) == null) {
            throw new BusinessException(SystemMessage.FIELD_REQUIRED);
        }

        // Logic giá bảo hành
        boolean isFreeWarranty = Boolean.TRUE.equals(request.getIsFreeWarranty());

        BigDecimal feeAmount = isFreeWarranty ? BigDecimal.ZERO
                : (request.getFeeAmount() != null ? request.getFeeAmount() : BigDecimal.ZERO);

        if (isFreeWarranty && feeAmount.compareTo(BigDecimal.ZERO) != 0) {
            throw new BusinessException(SystemMessage.REP_WARRANTY_PRICE_INVALID);
        }

        RepairFee fee = new RepairFee();
        fee.setRepair(repair);
        fee.initFee(
                request.getFeeName().trim(),
                feeAmount,
                request.getQuantity(),
                request.getUnitName(),
                isFreeWarranty,
                request.getVatPercent(),
                trimToNull(request.getNote())
        );
        repair.addFee(fee);

        RepairFee saved = repairFeeRepository.save(fee);
        repair.recalculateTotalAmount();

        return toFeeResponse(saved);
    }

    @Transactional
    public void deleteRepairFee(Long repairId, Long feeId) {
        Repair repair = repairRepository.findWithDetailsById(repairId)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));

        if (!EDITABLE_STATUSES.contains(repair.getRepairStatus())) {
            throw new BusinessException(SystemMessage.REP_CANNOT_MODIFY);
        }

        RepairFee fee = repairFeeRepository.findById(feeId)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_FEE_NOT_FOUND));

        if (!fee.getRepair().getId().equals(repairId)) {
            throw new BusinessException(SystemMessage.REP_FEE_NOT_FOUND);
        }

        repair.removeFee(fee);
        repairFeeRepository.delete(fee);
    }

    @Transactional
    public RepairFeeResponse updateRepairFee(Long repairId, Long feeId, RepairFeeRequest request) {
        Repair repair = repairRepository.findWithDetailsById(repairId)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));

        if (!EDITABLE_STATUSES.contains(repair.getRepairStatus())) {
            throw new BusinessException(SystemMessage.REP_CANNOT_MODIFY);
        }

        RepairFee fee = repairFeeRepository.findById(feeId)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_FEE_NOT_FOUND));

        if (!fee.getRepair().getId().equals(repairId)) {
            throw new BusinessException(SystemMessage.REP_FEE_NOT_FOUND);
        }

        if (request.getQuantity() != null && request.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException(SystemMessage.REP_ERR_001.getMessage());
        }
        fee.updateDetails(
                request.getFeeName() != null ? request.getFeeName().trim() : null,
                request.getFeeAmount(),
                request.getQuantity(),
                request.getUnitName(),
                request.getIsFreeWarranty(),
                request.getVatPercent(),
                trimToNull(request.getNote())
        );

        RepairFee saved = repairFeeRepository.save(fee);
        repair.recalculateTotalAmount();

        return toFeeResponse(saved);
    }

    // =====================================================================
    // Helper: Tính lại tổng tiền
    // =====================================================================



    /**
     * Khi lệnh chuyển thành underWarranty = TRUE,
     * đặt unit_price = 0 cho tất cả các dòng linh kiện.
     */


    // =====================================================================
    // Mapping: Entity -> Response
    // =====================================================================

    private RepairResponse toSummaryResponse(Repair repair) {
        RepairResponse response = repairMapper.toResponse(repair);

        // Resolve partner name (best effort)
        if (repair.getPartnerId() != null) {
            try {
                var partnerOpt = partnerRepository.findById(repair.getPartnerId());
                if (partnerOpt.isPresent()) {
                    response.setPartnerName(partnerOpt.get().getName());
                    response.setPartnerPhone(partnerOpt.get().getPhone());
                }
            } catch (Exception ex) {
                log.warn("Không lấy được thông tin đối tác #{} cho lệnh sửa chữa #{}: {}", repair.getPartnerId(), repair.getId(), ex.getMessage());
            }
        }

        // Resolve product name (best effort)
        if (repair.getProductId() != null) {
            try {
                var prodOpt = productRepository.findById(repair.getProductId());
                if (prodOpt.isPresent()) {
                    response.setProductName(prodOpt.get().getProductName());
                }
            } catch (Exception ex) {
                log.warn("Không lấy được tên sản phẩm #{} cho lệnh sửa chữa #{}: {}", repair.getProductId(), repair.getId(), ex.getMessage());
            }
        }

        // Resolve main serial number (best effort)
        if (repair.getSerialNumberId() != null) {
            try {
                var snOpt = serialNumberRepository.findById(repair.getSerialNumberId());
                if (snOpt.isPresent()) {
                    response.setSerialNumber(snOpt.get().getSerialNumber());
                }
            } catch (Exception ex) {
                log.warn("Không lấy được serial #{} cho lệnh sửa chữa #{}: {}", repair.getSerialNumberId(), repair.getId(), ex.getMessage());
            }
        }

        return response;
    }

    public RepairResponse toDetailResponse(Repair repair) {
        RepairResponse response = repairMapper.toResponse(repair);

        List<RepairLineResponse> lineResponses = toLineResponsesBatched(repair);

        List<RepairFeeResponse> feeResponses = repair.getFees().stream()
                .map(this::toFeeResponse)
                .collect(Collectors.toList());

        // Resolve partner name (best effort)
        if (repair.getPartnerId() != null) {
            try {
                var partnerOpt = partnerRepository.findById(repair.getPartnerId());
                if (partnerOpt.isPresent()) {
                    response.setPartnerName(partnerOpt.get().getName());
                    response.setPartnerPhone(partnerOpt.get().getPhone());
                }
            } catch (Exception ex) {
                log.warn("Không lấy được thông tin đối tác #{} cho lệnh sửa chữa #{}: {}", repair.getPartnerId(), repair.getId(), ex.getMessage());
            }
        }

        // Resolve product name (best effort)
        if (repair.getProductId() != null) {
            try {
                var prodOpt = productRepository.findById(repair.getProductId());
                if (prodOpt.isPresent()) {
                    response.setProductName(prodOpt.get().getProductName());
                }
            } catch (Exception ex) {
                log.warn("Không lấy được tên sản phẩm #{} cho lệnh sửa chữa #{}: {}", repair.getProductId(), repair.getId(), ex.getMessage());
            }
        }

        // Resolve main serial number (best effort)
        if (repair.getSerialNumberId() != null) {
            try {
                var snOpt = serialNumberRepository.findById(repair.getSerialNumberId());
                if (snOpt.isPresent()) {
                    response.setSerialNumber(snOpt.get().getSerialNumber());
                }
            } catch (Exception ex) {
                log.warn("Không lấy được serial #{} cho lệnh sửa chữa #{}: {}", repair.getSerialNumberId(), repair.getId(), ex.getMessage());
            }
        }

        response.setLines(lineResponses);
        response.setFees(feeResponses);
        return response;
    }

    /**
     * Maps every line of a repair to a response in a fixed number of queries instead of
     * O(n) - batches the serial-number text fallback and the available-quantity lookups
     * that {@link #toLineResponse(RepairLine)} otherwise performs once per line. Only
     * used by {@link #toDetailResponse}; single-line endpoints (add/update one line) keep
     * calling the simpler per-line {@link #toLineResponse(RepairLine)} since there's no
     * batch to build for just one line.
     */
    private List<RepairLineResponse> toLineResponsesBatched(Repair repair) {
        List<RepairLine> lines = repair.getRepairLines();
        if (lines == null || lines.isEmpty()) {
            return List.of();
        }
        Long warehouseId = repair.getWarehouseId() != null ? repair.getWarehouseId() : 1L;

        // Batch-resolve serial number display text for lines whose denormalized
        // serialNumberText/replacementSerialNumberText snapshot is missing (legacy rows).
        Set<Long> missingSerialIds = new HashSet<>();
        for (RepairLine line : lines) {
            if (trimToNull(line.getSerialNumberText()) == null && line.getSerialNumberId() != null) {
                missingSerialIds.add(line.getSerialNumberId());
            }
            if (trimToNull(line.getReplacementSerialNumberText()) == null && line.getReplacementSerialNumberId() != null) {
                missingSerialIds.add(line.getReplacementSerialNumberId());
            }
        }
        Map<Long, String> serialTextById = missingSerialIds.isEmpty() ? Map.of()
                : serialNumberRepository.findAllById(missingSerialIds).stream()
                        .collect(Collectors.toMap(SerialNumber::getId, SerialNumber::getSerialNumber));

        // Batch-resolve available quantity per (variant, serial) or per variant, matching
        // the exact branching toLineResponse(RepairLine) uses per line.
        Set<Long> serialTrackedVariantIds = new HashSet<>();
        Set<Long> serialTrackedSerialIds = new HashSet<>();
        Set<Long> looseVariantIds = new HashSet<>();
        for (RepairLine line : lines) {
            Long stockSerialNumberId = "REPLACE".equals(line.getActionType())
                    ? line.getReplacementSerialNumberId()
                    : line.getSerialNumberId();
            if (stockSerialNumberId != null && !"REMOVE".equals(line.getActionType())) {
                serialTrackedVariantIds.add(line.getComponentVariantId());
                serialTrackedSerialIds.add(stockSerialNumberId);
            } else {
                looseVariantIds.add(line.getComponentVariantId());
            }
        }

        Map<String, InventoryBalance> serialBalanceByKey = new HashMap<>();
        if (!serialTrackedVariantIds.isEmpty() && !serialTrackedSerialIds.isEmpty()) {
            try {
                for (InventoryBalance balance : inventoryBalanceRepository.findByWarehouseAndVariantInAndSerialNumberIn(
                        warehouseId, new ArrayList<>(serialTrackedVariantIds), new ArrayList<>(serialTrackedSerialIds), "GOOD")) {
                    serialBalanceByKey.put(balance.getVariantId() + ":" + balance.getSerialNumberId(), balance);
                }
            } catch (Exception ex) {
                log.warn("Không lấy được tồn kho theo serial cho lệnh sửa chữa #{}: {}", repair.getId(), ex.getMessage());
            }
        }

        Map<Long, BigDecimal> looseQtyByVariant = new HashMap<>();
        if (!looseVariantIds.isEmpty()) {
            try {
                for (Object[] row : inventoryBalanceRepository.sumAvailableLooseQuantitiesGroupedByVariant(
                        warehouseId, new ArrayList<>(looseVariantIds), "GOOD")) {
                    looseQtyByVariant.put((Long) row[0], (BigDecimal) row[1]);
                }
            } catch (Exception ex) {
                log.warn("Không lấy được tồn kho khả dụng theo lô cho lệnh sửa chữa #{}: {}", repair.getId(), ex.getMessage());
            }
        }

        return lines.stream()
                .map(line -> toLineResponseFromBatch(line, serialTextById, serialBalanceByKey, looseQtyByVariant))
                .collect(Collectors.toList());
    }

    public RepairLineResponse toLineResponse(RepairLine line) {
        RepairLineResponse response = repairMapper.toLineResponse(line);

        // Resolve component name (best effort)
        if (line.getComponentVariant() != null) {
            response.setComponentName(line.getComponentVariant().getVariantName());
            response.setComponentSku(line.getComponentVariant().getSku());
        } else if (line.getComponentVariantId() != null) {
            try {
                var variantOpt = productVariantRepository.findById(line.getComponentVariantId());
                if (variantOpt.isPresent()) {
                    response.setComponentName(variantOpt.get().getVariantName());
                    response.setComponentSku(variantOpt.get().getSku());
                }
            } catch (Exception ex) {
                log.warn("Không lấy được thông tin linh kiện #{} cho dòng sửa chữa #{}: {}", line.getComponentVariantId(), line.getId(), ex.getMessage());
            }
        }

        // Resolve serial number: prefer the denormalized text snapshot already on the
        // line (zero queries); only hit the DB for legacy rows missing that snapshot.
        if (response.getSerialNumber() == null && line.getSerialNumberId() != null) {
            String text = trimToNull(line.getSerialNumberText());
            if (text != null) {
                response.setSerialNumber(text);
            } else {
                try {
                    var snOpt = serialNumberRepository.findById(line.getSerialNumberId());
                    snOpt.ifPresent(sn -> response.setSerialNumber(sn.getSerialNumber()));
                } catch (Exception ex) {
                    log.warn("Không lấy được serial #{} cho dòng sửa chữa #{}: {}", line.getSerialNumberId(), line.getId(), ex.getMessage());
                }
            }
        }

        if (response.getReplacementSerialNumber() == null && line.getReplacementSerialNumberId() != null) {
            String text = trimToNull(line.getReplacementSerialNumberText());
            if (text != null) {
                response.setReplacementSerialNumber(text);
            } else {
                try {
                    var snOpt = serialNumberRepository.findById(line.getReplacementSerialNumberId());
                    snOpt.ifPresent(sn -> response.setReplacementSerialNumber(sn.getSerialNumber()));
                } catch (Exception ex) {
                    log.warn("Không lấy được serial thay thế #{} cho dòng sửa chữa #{}: {}", line.getReplacementSerialNumberId(), line.getId(), ex.getMessage());
                }
            }
        }

        // Calculate available quantity
        BigDecimal availableQty = BigDecimal.ZERO;
        try {
            Long warehouseId = line.getRepair() != null && line.getRepair().getWarehouseId() != null ? line.getRepair().getWarehouseId() : 1L; // Fallback to 1L if needed, though best to rely on proper config
            Long stockSerialNumberId = "REPLACE".equals(line.getActionType())
                    ? line.getReplacementSerialNumberId()
                    : line.getSerialNumberId();
            if (stockSerialNumberId != null && !"REMOVE".equals(line.getActionType())) {
                InventoryBalance balance = inventoryBalanceRepository.findByWarehouseVariantSerial(
                        warehouseId, line.getComponentVariantId(), stockSerialNumberId, "GOOD").orElse(null);
                if (balance != null) {
                    availableQty = balance.getQuantityOnHand().subtract(balance.getQuantityReserved());
                }
            } else {
                availableQty = inventoryBalanceRepository.sumAvailableLooseQuantityByWarehouseAndVariant(
                        warehouseId, line.getComponentVariantId(), "GOOD");
            }
            if (availableQty.compareTo(BigDecimal.ZERO) < 0) availableQty = BigDecimal.ZERO;
        } catch (Exception ex) {
            log.warn("Không tính được tồn kho khả dụng cho dòng sửa chữa #{}: {}", line.getId(), ex.getMessage());
        }

        BigDecimal lineAmount = line.getUnitPrice().multiply(line.getQuantity());

        response.setAvailableQuantity(availableQty);
        response.setLineAmount(lineAmount);
        return response;
    }

    /**
     * Same mapping as {@link #toLineResponse(RepairLine)}, but resolves the serial-text
     * fallback and available quantity purely from the batch maps built once in
     * {@link #toLineResponsesBatched} - no per-line query, including when a lookup is
     * legitimately absent from the batch (e.g. no InventoryBalance row exists for that
     * variant/serial, which correctly means zero available, not "go query it").
     */
    private RepairLineResponse toLineResponseFromBatch(RepairLine line, Map<Long, String> serialTextById,
            Map<String, InventoryBalance> serialBalanceByKey, Map<Long, BigDecimal> looseQtyByVariant) {
        RepairLineResponse response = repairMapper.toLineResponse(line);

        if (line.getComponentVariant() != null) {
            response.setComponentName(line.getComponentVariant().getVariantName());
            response.setComponentSku(line.getComponentVariant().getSku());
        } else if (line.getComponentVariantId() != null) {
            try {
                var variantOpt = productVariantRepository.findById(line.getComponentVariantId());
                if (variantOpt.isPresent()) {
                    response.setComponentName(variantOpt.get().getVariantName());
                    response.setComponentSku(variantOpt.get().getSku());
                }
            } catch (Exception ex) {
                log.warn("Không lấy được thông tin linh kiện #{} cho dòng sửa chữa #{}: {}", line.getComponentVariantId(), line.getId(), ex.getMessage());
            }
        }

        if (response.getSerialNumber() == null && line.getSerialNumberId() != null) {
            String text = trimToNull(line.getSerialNumberText());
            response.setSerialNumber(text != null ? text : serialTextById.get(line.getSerialNumberId()));
        }
        if (response.getReplacementSerialNumber() == null && line.getReplacementSerialNumberId() != null) {
            String text = trimToNull(line.getReplacementSerialNumberText());
            response.setReplacementSerialNumber(text != null ? text : serialTextById.get(line.getReplacementSerialNumberId()));
        }

        BigDecimal availableQty = BigDecimal.ZERO;
        Long stockSerialNumberId = "REPLACE".equals(line.getActionType())
                ? line.getReplacementSerialNumberId()
                : line.getSerialNumberId();
        if (stockSerialNumberId != null && !"REMOVE".equals(line.getActionType())) {
            InventoryBalance balance = serialBalanceByKey.get(line.getComponentVariantId() + ":" + stockSerialNumberId);
            if (balance != null) {
                availableQty = balance.getQuantityOnHand().subtract(balance.getQuantityReserved());
            }
        } else {
            availableQty = looseQtyByVariant.getOrDefault(line.getComponentVariantId(), BigDecimal.ZERO);
        }
        if (availableQty.compareTo(BigDecimal.ZERO) < 0) availableQty = BigDecimal.ZERO;

        BigDecimal lineAmount = line.getUnitPrice().multiply(line.getQuantity());

        response.setAvailableQuantity(availableQty);
        response.setLineAmount(lineAmount);
        return response;
    }

    public RepairFeeResponse toFeeResponse(RepairFee fee) {
        return repairMapper.toFeeResponse(fee);
    }

    // =====================================================================
    // Validation & Utilities
    // =====================================================================

    private void validateCreateRequest(RepairRequest request) {
        if (request == null) {
            throw new BusinessException(SystemMessage.FIELD_REQUIRED);
        }
        if (request.getPartnerId() == null) {
            throw new BusinessException(SystemMessage.REP_PARTNER_REQUIRED);
        }
        if (request.getProductId() == null) {
            throw new BusinessException(SystemMessage.REP_ERR_005.getMessage());
        }
        if (request.getExpectedDate() != null && request.getReceivedDate() != null
                && request.getExpectedDate().isBefore(request.getReceivedDate())) {
            throw new BusinessException(SystemMessage.REP_ERR_004.getMessage());
        }
    }

    private void validateLineRequest(RepairLineRequest request) {
        if (request.getComponentVariantId() == null) {
            throw new BusinessException(SystemMessage.REP_ERR_003.getMessage());
        }
        if (!VALID_ACTION_TYPES.contains(request.getActionType().toUpperCase())) {
            throw new BusinessException(SystemMessage.REP_ERR_002.getMessage());
        }
        if (request.getQuantity() == null || request.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException(SystemMessage.REP_ERR_001.getMessage());
        }
    }

    private String generateRepairCode() {
        return codeGeneratorService.generateCode("repairs", "repair_code", "SC", 6);
    }

    /**
     * Kiểm tra mã lệnh có tồn tại chưa (dùng cho validate real-time ở Frontend).
     */
    @Transactional(readOnly = true)
    public boolean checkCodeExists(String code) {
        return repairRepository.existsByRepairCode(code);
    }

    private String resolveInvoiceMethod(String invoiceMethod) {
        if (invoiceMethod == null) return "after_repair";
        String normalized = invoiceMethod.trim().toLowerCase();
        if (!VALID_INVOICE_METHODS.contains(normalized)) {
            return "after_repair";
        }
        return normalized;
    }

    private void clearLineSerials(RepairLine line) {
        line.setSerialNumberId(null);
        line.setSerialNumberText(null);
        line.setReplacementSerialNumberId(null);
        line.setReplacementSerialNumberText(null);
    }

    private String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) return null;
        return value.trim();
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

    private ProductVariant resolveRepairVariant(Long variantId, Long serialNumberId, Long legacyProductId) {
        ProductVariant variant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new BusinessException("SKU cua thiet bi sua chua khong ton tai"));
        if (serialNumberId != null) {
            SerialNumber serial = serialNumberRepository.findById(serialNumberId)
                    .orElseThrow(() -> new BusinessException("Serial cua thiet bi sua chua khong ton tai"));
            if (!variant.getId().equals(serial.getVariantId())) {
                throw new BusinessException("Serial khong thuoc SKU cua thiet bi sua chua");
            }
        }
        if (legacyProductId != null && (variant.getProduct() == null
                || !legacyProductId.equals(variant.getProduct().getId()))) {
            throw new BusinessException("SKU khong thuoc san pham da chon");
        }
        if (variant.getProduct() == null) {
            throw new BusinessException("SKU chua duoc gan san pham");
        }
        return variant;
    }

}
