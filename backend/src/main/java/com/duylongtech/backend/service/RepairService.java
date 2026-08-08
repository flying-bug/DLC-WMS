package com.duylongtech.backend.service;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.RepairFeeRequest;
import com.duylongtech.backend.dto.request.RepairLineRequest;
import com.duylongtech.backend.dto.request.RepairRequest;
import com.duylongtech.backend.dto.response.RepairFeeResponse;
import com.duylongtech.backend.dto.response.RepairLineResponse;
import com.duylongtech.backend.dto.response.RepairResponse;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.entity.ProductVariant;
import com.duylongtech.backend.entity.Repair;
import com.duylongtech.backend.entity.RepairFee;
import com.duylongtech.backend.entity.RepairLine;
import com.duylongtech.backend.entity.SerialNumber;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.PartnerRepository;
import com.duylongtech.backend.repository.ProductRepository;
import com.duylongtech.backend.repository.ProductVariantRepository;
import com.duylongtech.backend.repository.RepairFeeRepository;
import com.duylongtech.backend.repository.RepairLineRepository;
import com.duylongtech.backend.repository.RepairRepository;
import com.duylongtech.backend.repository.SerialNumberRepository;
import com.duylongtech.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import com.duylongtech.backend.repository.InventoryBalanceRepository;
import com.duylongtech.backend.entity.InventoryBalance;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;

/**
 * Service xử lý CRUD cơ bản cho Lệnh Sửa Chữa (Repair Management).
 * Xử lý logic giá bảo hành: nếu underWarranty=TRUE hoặc isFreeWarranty=TRUE thì unit_price = 0.
 * Workflow (chuyển trạng thái) được xử lý bởi RepairWorkflowService.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RepairService {

    private static final Set<String> EDITABLE_STATUSES = Set.of("DRAFT", "QUOTATION", "CONFIRMED", "UNDER_REPAIR");
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

        Repair repair = Repair.builder()
                .repairCode(repairCode)
                .partnerId(request.getPartnerId())
                .productId(request.getProductId())
                .productQuantity(request.getProductQuantity() != null ? request.getProductQuantity() : 1)
                .productUnit(trimToNull(request.getProductUnit()))
                .warehouseId(request.getWarehouseId())
                .serialNumberId(request.getSerialNumberId())
                .warrantyId(request.getWarrantyId())
                .referenceType(trimToNull(request.getReferenceType()))
                .referenceId(request.getReferenceId())
                .referenceCode(trimToNull(request.getReferenceCode()))
                .receivedDate(request.getReceivedDate() != null ? request.getReceivedDate() : LocalDate.now())
                .expectedDate(request.getExpectedDate())
                .repairStatus("DRAFT")
                .issueDescription(trimToNull(request.getIssueDescription()))
                .diagnosisNote(trimToNull(request.getDiagnosisNote()))
                .underWarranty(request.getUnderWarranty() != null ? request.getUnderWarranty() : false)
                .repairWarrantyEndDate(request.getRepairWarrantyEndDate())
                .invoiceMethod(resolveInvoiceMethod(request.getInvoiceMethod()))
                .responsiblePerson(trimToNull(request.getResponsiblePerson()))
                .totalAmount(BigDecimal.ZERO)
                .note(trimToNull(request.getNote()))
                .createdBy(currentUserId)
                .build();

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

        if (request.getPartnerId() != null) repair.setPartnerId(request.getPartnerId());
        if (request.getProductId() != null) repair.setProductId(request.getProductId());
        if (request.getProductQuantity() != null) repair.setProductQuantity(request.getProductQuantity());
        if (request.getProductUnit() != null) repair.setProductUnit(trimToNull(request.getProductUnit()));
        if (request.getWarehouseId() != null) repair.setWarehouseId(request.getWarehouseId());
        if (request.getSerialNumberId() != null) repair.setSerialNumberId(request.getSerialNumberId());
        if (request.getWarrantyId() != null) repair.setWarrantyId(request.getWarrantyId());
        if (request.getReferenceType() != null) repair.setReferenceType(trimToNull(request.getReferenceType()));
        if (request.getReferenceId() != null) repair.setReferenceId(request.getReferenceId());
        if (request.getReferenceCode() != null) repair.setReferenceCode(trimToNull(request.getReferenceCode()));
        if (request.getReceivedDate() != null) repair.setReceivedDate(request.getReceivedDate());
        if (request.getExpectedDate() != null) repair.setExpectedDate(request.getExpectedDate());
        if (request.getIssueDescription() != null) repair.setIssueDescription(trimToNull(request.getIssueDescription()));
        if (request.getDiagnosisNote() != null) repair.setDiagnosisNote(trimToNull(request.getDiagnosisNote()));
        if (request.getInternalNotes() != null) repair.setInternalNotes(trimToNull(request.getInternalNotes()));
        if (request.getUnderWarranty() != null) {
            repair.setUnderWarranty(request.getUnderWarranty());
            // Nếu chuyển thành under_warranty -> recalculate prices
            if (Boolean.TRUE.equals(request.getUnderWarranty())) {
                applyWarrantyZeroPriceToLines(repair);
            }
        }
        if (request.getRepairWarrantyEndDate() != null) repair.setRepairWarrantyEndDate(request.getRepairWarrantyEndDate());
        if (request.getInvoiceMethod() != null) repair.setInvoiceMethod(resolveInvoiceMethod(request.getInvoiceMethod()));
        if (request.getResponsiblePerson() != null) repair.setResponsiblePerson(trimToNull(request.getResponsiblePerson()));
        if (request.getNote() != null) repair.setNote(trimToNull(request.getNote()));

        if (repair.getExpectedDate() != null && repair.getReceivedDate() != null
                && repair.getExpectedDate().isBefore(repair.getReceivedDate())) {
            throw new BusinessException("Ngày dự kiến không thể nhỏ hơn ngày tiếp nhận.");
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

        repair.setInternalNotes(trimToNull(notes));
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

        // Logic giá bảo hành: nếu lệnh đang bảo hành hoặc line is_free_warranty -> unit_price = 0
        boolean isFreeWarranty = Boolean.TRUE.equals(request.getIsFreeWarranty())
                || Boolean.TRUE.equals(repair.getUnderWarranty());

        BigDecimal unitPrice = isFreeWarranty ? BigDecimal.ZERO
                : (request.getUnitPrice() != null ? request.getUnitPrice() : BigDecimal.ZERO);

        if (isFreeWarranty && unitPrice.compareTo(BigDecimal.ZERO) != 0) {
            throw new BusinessException(SystemMessage.REP_WARRANTY_PRICE_INVALID);
        }

        RepairLine line = RepairLine.builder()
                .repair(repair)
                .componentVariantId(request.getComponentVariantId())
                .actionType(request.getActionType().toUpperCase())
                .quantity(request.getQuantity())
                .unitPrice(unitPrice)
                .isFreeWarranty(isFreeWarranty)
                .serialNumberId(request.getSerialNumberId())
                .serialNumberText(request.getSerialNumber())
                .replacementSerialNumberId(request.getReplacementSerialNumberId())
                .replacementSerialNumberText(request.getReplacementSerialNumber())

                .note(trimToNull(request.getNote()))
                .build();

        RepairLine saved = repairLineRepository.save(line);
        recalculateTotalAmount(repair);

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

        if (request.getComponentVariantId() != null && !request.getComponentVariantId().equals(line.getComponentVariantId())) {
            line.setComponentVariantId(request.getComponentVariantId());
            clearLineSerials(line);
        }
        if (request.getQuantity() != null) {
            if (request.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessException("quantity phải lớn hơn 0");
            }
            line.setQuantity(request.getQuantity());
        }
        if (request.getActionType() != null) {
            String normalizedActionType = request.getActionType().toUpperCase();
            if (!VALID_ACTION_TYPES.contains(normalizedActionType)) {
                throw new BusinessException("actionType phải là ADD, REPLACE hoặc REMOVE");
            }
            if (!normalizedActionType.equals(line.getActionType())) {
                line.setActionType(normalizedActionType);
                clearLineSerials(line);
            }
        }
        if (request.getUnitPrice() != null) line.setUnitPrice(request.getUnitPrice());
        if (request.getIsFreeWarranty() != null) {
            line.setIsFreeWarranty(request.getIsFreeWarranty());
            if (Boolean.TRUE.equals(request.getIsFreeWarranty())) {
                line.setUnitPrice(BigDecimal.ZERO);
            }
        }

        if (request.getNote() != null) line.setNote(trimToNull(request.getNote()));
        if (request.getSerialNumberId() != null) line.setSerialNumberId(request.getSerialNumberId() == -1 ? null : request.getSerialNumberId());
        if (request.getSerialNumber() != null) line.setSerialNumberText(request.getSerialNumber().isEmpty() ? null : request.getSerialNumber());
        if (request.getReplacementSerialNumberId() != null) line.setReplacementSerialNumberId(request.getReplacementSerialNumberId() == -1 ? null : request.getReplacementSerialNumberId());
        if (request.getReplacementSerialNumber() != null) line.setReplacementSerialNumberText(request.getReplacementSerialNumber().isEmpty() ? null : request.getReplacementSerialNumber());

        repairLineRepository.save(line);
        recalculateTotalAmount(repair);

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

        repairLineRepository.delete(line);
        recalculateTotalAmount(repair);
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
        boolean isFreeWarranty = Boolean.TRUE.equals(request.getIsFreeWarranty())
                || Boolean.TRUE.equals(repair.getUnderWarranty());

        BigDecimal feeAmount = isFreeWarranty ? BigDecimal.ZERO
                : (request.getFeeAmount() != null ? request.getFeeAmount() : BigDecimal.ZERO);

        if (isFreeWarranty && feeAmount.compareTo(BigDecimal.ZERO) != 0) {
            throw new BusinessException(SystemMessage.REP_WARRANTY_PRICE_INVALID);
        }

        RepairFee fee = RepairFee.builder()
                .repair(repair)
                .feeName(request.getFeeName().trim())
                .feeAmount(feeAmount)
                .quantity(request.getQuantity() != null ? request.getQuantity() : BigDecimal.ONE)
                .unitName(request.getUnitName())
                .isFreeWarranty(isFreeWarranty)
                .note(trimToNull(request.getNote()))
                .build();

        RepairFee saved = repairFeeRepository.save(fee);
        recalculateTotalAmount(repair);

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

        repairFeeRepository.delete(fee);
        recalculateTotalAmount(repair);
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

        if (request.getFeeAmount() != null) {
            fee.setFeeAmount(request.getFeeAmount());
        }
        if (request.getIsFreeWarranty() != null) {
            fee.setIsFreeWarranty(request.getIsFreeWarranty());
            if (fee.getIsFreeWarranty()) {
                fee.setFeeAmount(BigDecimal.ZERO);
            }
        }
        if (request.getQuantity() != null) {
            fee.setQuantity(request.getQuantity());
        }

        RepairFee saved = repairFeeRepository.save(fee);
        recalculateTotalAmount(repair);

        return toFeeResponse(saved);
    }

    // =====================================================================
    // Helper: Tính lại tổng tiền
    // =====================================================================

    public void recalculateTotalAmount(Repair repair) {
        List<RepairLine> lines = repairLineRepository.findByRepairId(repair.getId());
        List<RepairFee> fees = repairFeeRepository.findByRepairId(repair.getId());

        BigDecimal lineTotal = lines.stream()
                .filter(l -> "ADD".equals(l.getActionType()) || "REPLACE".equals(l.getActionType()))
                .map(l -> {
                    BigDecimal qty = l.getQuantity() != null ? l.getQuantity() : BigDecimal.ZERO;
                    return l.getUnitPrice().multiply(qty);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal feeTotal = fees.stream()
                .map(f -> f.getFeeAmount().multiply(f.getQuantity() != null ? f.getQuantity() : BigDecimal.ONE))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        repair.setTotalAmount(lineTotal.add(feeTotal));
        repairRepository.save(repair);
    }

    /**
     * Khi lệnh chuyển thành underWarranty = TRUE,
     * đặt unit_price = 0 cho tất cả các dòng linh kiện.
     */
    private void applyWarrantyZeroPriceToLines(Repair repair) {
        List<RepairLine> lines = repairLineRepository.findByRepairId(repair.getId());
        for (RepairLine line : lines) {
            line.setUnitPrice(BigDecimal.ZERO);
            line.setIsFreeWarranty(true);
        }
        if (!lines.isEmpty()) {
            repairLineRepository.saveAll(lines);
        }

        List<RepairFee> fees = repairFeeRepository.findByRepairId(repair.getId());
        for (RepairFee fee : fees) {
            fee.setFeeAmount(BigDecimal.ZERO);
            fee.setIsFreeWarranty(true);
        }
        if (!fees.isEmpty()) {
            repairFeeRepository.saveAll(fees);
        }
    }

    // =====================================================================
    // Mapping: Entity -> Response
    // =====================================================================

    private RepairResponse toSummaryResponse(Repair repair) {
        // Resolve partner name (best effort)
        String partnerName = null;
        String partnerPhone = null;
        if (repair.getPartnerId() != null) {
            try {
                var partnerOpt = partnerRepository.findById(repair.getPartnerId());
                if (partnerOpt.isPresent()) {
                    partnerName = partnerOpt.get().getName();
                    partnerPhone = partnerOpt.get().getPhone();
                }
            } catch (Exception ignored) { /* best-effort */ }
        }

        // Resolve product name (best effort)
        String productName = null;
        if (repair.getProductId() != null) {
            try {
                var prodOpt = productRepository.findById(repair.getProductId());
                if (prodOpt.isPresent()) {
                    productName = prodOpt.get().getProductName();
                }
            } catch (Exception ignored) { /* best-effort */ }
        }

        // Resolve main serial number (best effort)
        String serialNumber = null;
        if (repair.getSerialNumberId() != null) {
            try {
                var snOpt = serialNumberRepository.findById(repair.getSerialNumberId());
                if (snOpt.isPresent()) {
                    serialNumber = snOpt.get().getSerialNumber();
                }
            } catch (Exception ignored) { /* best-effort */ }
        }

        return RepairResponse.builder()
                .id(repair.getId())
                .repairCode(repair.getRepairCode())
                .partnerId(repair.getPartnerId())
                .partnerName(partnerName)
                .partnerPhone(partnerPhone)
                .productId(repair.getProductId())
                .productName(productName)
                .productQuantity(repair.getProductQuantity())
                .productUnit(repair.getProductUnit())
                .warehouseId(repair.getWarehouseId())
                .serialNumberId(repair.getSerialNumberId())
                .serialNumber(serialNumber)
                .warrantyId(repair.getWarrantyId())
                .referenceType(repair.getReferenceType())
                .referenceId(repair.getReferenceId())
                .referenceCode(repair.getReferenceCode())
                .receivedDate(repair.getReceivedDate())
                .expectedDate(repair.getExpectedDate())
                .completedDate(repair.getCompletedDate())
                .repairStatus(repair.getRepairStatus())
                .issueDescription(repair.getIssueDescription())
                .diagnosisNote(repair.getDiagnosisNote())
                .internalNotes(repair.getInternalNotes())
                .solutionDescription(repair.getSolutionDescription())
                .underWarranty(repair.getUnderWarranty())
                .invoiceMethod(repair.getInvoiceMethod())
                .responsiblePerson(repair.getResponsiblePerson())
                .totalAmount(repair.getTotalAmount())
                .createdBy(repair.getCreatedBy())
                .createdAt(repair.getCreatedAt())
                .updatedAt(repair.getUpdatedAt())
                .version(repair.getVersion())
                .build();
    }

    public RepairResponse toDetailResponse(Repair repair) {
        List<RepairLineResponse> lineResponses = repair.getRepairLines().stream()
                .map(this::toLineResponse)
                .collect(Collectors.toList());

        List<RepairFeeResponse> feeResponses = repair.getFees().stream()
                .map(this::toFeeResponse)
                .collect(Collectors.toList());

        // Resolve partner name (best effort)
        String partnerName = null;
        String partnerPhone = null;
        if (repair.getPartnerId() != null) {
            try {
                var partnerOpt = partnerRepository.findById(repair.getPartnerId());
                if (partnerOpt.isPresent()) {
                    partnerName = partnerOpt.get().getName();
                    partnerPhone = partnerOpt.get().getPhone();
                }
            } catch (Exception ignored) { /* best-effort */ }
        }

        // Resolve product name (best effort)
        String productName = null;
        if (repair.getProductId() != null) {
            try {
                var prodOpt = productRepository.findById(repair.getProductId());
                if (prodOpt.isPresent()) {
                    productName = prodOpt.get().getProductName();
                }
            } catch (Exception ignored) { /* best-effort */ }
        }

        // Resolve main serial number (best effort)
        String serialNumber = null;
        if (repair.getSerialNumberId() != null) {
            try {
                var snOpt = serialNumberRepository.findById(repair.getSerialNumberId());
                if (snOpt.isPresent()) {
                    serialNumber = snOpt.get().getSerialNumber();
                }
            } catch (Exception ignored) { /* best-effort */ }
        }

        return RepairResponse.builder()
                .id(repair.getId())
                .repairCode(repair.getRepairCode())
                .partnerId(repair.getPartnerId())
                .partnerName(partnerName)
                .partnerPhone(partnerPhone)
                .productId(repair.getProductId())
                .productName(productName)
                .productQuantity(repair.getProductQuantity())
                .productUnit(repair.getProductUnit())
                .warehouseId(repair.getWarehouseId())
                .serialNumberId(repair.getSerialNumberId())
                .serialNumber(serialNumber)
                .warrantyId(repair.getWarrantyId())
                .referenceType(repair.getReferenceType())
                .referenceId(repair.getReferenceId())
                .referenceCode(repair.getReferenceCode())
                .receivedDate(repair.getReceivedDate())
                .expectedDate(repair.getExpectedDate())
                .completedDate(repair.getCompletedDate())
                .repairWarrantyEndDate(repair.getRepairWarrantyEndDate())
                .repairStatus(repair.getRepairStatus())
                .issueDescription(repair.getIssueDescription())
                .diagnosisNote(repair.getDiagnosisNote())
                .internalNotes(repair.getInternalNotes())
                .solutionDescription(repair.getSolutionDescription())
                .underWarranty(repair.getUnderWarranty())
                .invoiceMethod(repair.getInvoiceMethod())
                .responsiblePerson(repair.getResponsiblePerson())
                .totalAmount(repair.getTotalAmount())
                .note(repair.getNote())
                .createdBy(repair.getCreatedBy())
                .approvedBy(repair.getApprovedBy())
                .createdAt(repair.getCreatedAt())
                .updatedAt(repair.getUpdatedAt())
                .version(repair.getVersion())
                .lines(lineResponses)
                .fees(feeResponses)
                .build();
    }

    public RepairLineResponse toLineResponse(RepairLine line) {
        // Resolve component name (best effort)
        String componentName = null;
        String componentSku = null;
        if (line.getComponentVariant() != null) {
            componentName = line.getComponentVariant().getVariantName();
            componentSku = line.getComponentVariant().getSku();
        } else if (line.getComponentVariantId() != null) {
            try {
                var variantOpt = productVariantRepository.findById(line.getComponentVariantId());
                if (variantOpt.isPresent()) {
                    componentName = variantOpt.get().getVariantName();
                    componentSku = variantOpt.get().getSku();
                }
            } catch (Exception ignored) { /* best-effort */ }
        }

        // Resolve serial number
        String serialNum = line.getSerialNumberText();
        if (line.getSerialNumberId() != null) {
            try {
                var snOpt = serialNumberRepository.findById(line.getSerialNumberId());
                if (snOpt.isPresent()) {
                    serialNum = snOpt.get().getSerialNumber();
                }
            } catch (Exception ignored) { /* best-effort */ }
        }

        String replacementSerialNum = line.getReplacementSerialNumberText();
        if (line.getReplacementSerialNumberId() != null) {
            try {
                var snOpt = serialNumberRepository.findById(line.getReplacementSerialNumberId());
                if (snOpt.isPresent()) {
                    replacementSerialNum = snOpt.get().getSerialNumber();
                }
            } catch (Exception ignored) { /* best-effort */ }
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
        } catch (Exception ignored) {}

        BigDecimal lineAmount = line.getUnitPrice().multiply(line.getQuantity());

        return RepairLineResponse.builder()
                .id(line.getId())
                .repairId(line.getRepair() != null ? line.getRepair().getId() : null)
                .componentVariantId(line.getComponentVariantId())
                .componentName(componentName)
                .componentSku(componentSku)
                .actionType(line.getActionType())
                .quantity(line.getQuantity())
                .availableQuantity(availableQty)
                .unitPrice(line.getUnitPrice())
                .lineAmount(lineAmount)
                .isFreeWarranty(line.getIsFreeWarranty())
                .serialNumberId(line.getSerialNumberId())
                .serialNumber(serialNum)
                .replacementSerialNumberId(line.getReplacementSerialNumberId())
                .replacementSerialNumber(replacementSerialNum)

                .note(line.getNote())
                .createdAt(line.getCreatedAt())
                .updatedAt(line.getUpdatedAt())
                .build();
    }

    public RepairFeeResponse toFeeResponse(RepairFee fee) {
        return RepairFeeResponse.builder()
                .id(fee.getId())
                .repairId(fee.getRepair() != null ? fee.getRepair().getId() : null)
                .feeName(fee.getFeeName())
                .feeAmount(fee.getFeeAmount())
                .quantity(fee.getQuantity())
                .unitName(fee.getUnitName())
                .isFreeWarranty(fee.getIsFreeWarranty())
                .note(fee.getNote())
                .createdAt(fee.getCreatedAt())
                .updatedAt(fee.getUpdatedAt())
                .build();
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
            throw new BusinessException("productId là bắt buộc");
        }
        if (request.getExpectedDate() != null && request.getReceivedDate() != null
                && request.getExpectedDate().isBefore(request.getReceivedDate())) {
            throw new BusinessException("Ngày dự kiến không thể nhỏ hơn ngày tiếp nhận.");
        }
    }

    private void validateLineRequest(RepairLineRequest request) {
        if (request.getComponentVariantId() == null) {
            throw new BusinessException("componentVariantId là bắt buộc");
        }
        if (!VALID_ACTION_TYPES.contains(request.getActionType().toUpperCase())) {
            throw new BusinessException("actionType phải là ADD, REPLACE hoặc REMOVE");
        }
        if (request.getQuantity() == null || request.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("quantity phải lớn hơn 0");
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
}
