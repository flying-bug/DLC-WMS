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
import com.duylongtech.backend.repository.ProductVariantRepository;
import com.duylongtech.backend.repository.RepairFeeRepository;
import com.duylongtech.backend.repository.RepairLineRepository;
import com.duylongtech.backend.repository.RepairRepository;
import com.duylongtech.backend.repository.SerialNumberRepository;
import com.duylongtech.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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

    private static final Set<String> EDITABLE_STATUSES = Set.of("DRAFT", "QUOTATION");
    private static final Set<String> VALID_INVOICE_METHODS = Set.of("none", "b4repair", "after_repair");
    private static final Set<String> VALID_ACTION_TYPES = Set.of("ADD", "REMOVE");

    private final RepairRepository repairRepository;
    private final RepairLineRepository repairLineRepository;
    private final RepairFeeRepository repairFeeRepository;
    private final PartnerRepository partnerRepository;
    private final ProductVariantRepository productVariantRepository;
    private final SerialNumberRepository serialNumberRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final CodeGeneratorService codeGeneratorService;

    // =====================================================================
    // READ Operations
    // =====================================================================

    @Transactional(readOnly = true)
    public Page<RepairResponse> getRepairs(String keyword, String status, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1));
        String normalizedStatus = trimToNull(status) != null ? status.trim().toUpperCase() : null;
        return repairRepository.searchRepairs(trimToNull(keyword), normalizedStatus, pageable)
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
                .warehouseId(request.getWarehouseId())
                .serialNumberId(request.getSerialNumberId())
                .warrantyId(request.getWarrantyId())
                .receivedDate(request.getReceivedDate() != null ? request.getReceivedDate() : LocalDate.now())
                .expectedDate(request.getExpectedDate())
                .repairStatus("DRAFT")
                .issueDescription(trimToNull(request.getIssueDescription()))
                .diagnosisNote(trimToNull(request.getDiagnosisNote()))
                .underWarranty(request.getUnderWarranty() != null ? request.getUnderWarranty() : false)
                .repairWarrantyEndDate(request.getRepairWarrantyEndDate())
                .invoiceMethod(resolveInvoiceMethod(request.getInvoiceMethod()))
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
        if (request.getWarehouseId() != null) repair.setWarehouseId(request.getWarehouseId());
        if (request.getSerialNumberId() != null) repair.setSerialNumberId(request.getSerialNumberId());
        if (request.getWarrantyId() != null) repair.setWarrantyId(request.getWarrantyId());
        if (request.getReceivedDate() != null) repair.setReceivedDate(request.getReceivedDate());
        if (request.getExpectedDate() != null) repair.setExpectedDate(request.getExpectedDate());
        if (request.getIssueDescription() != null) repair.setIssueDescription(trimToNull(request.getIssueDescription()));
        if (request.getDiagnosisNote() != null) repair.setDiagnosisNote(trimToNull(request.getDiagnosisNote()));
        if (request.getUnderWarranty() != null) {
            repair.setUnderWarranty(request.getUnderWarranty());
            // Nếu chuyển thành under_warranty -> recalculate prices
            if (Boolean.TRUE.equals(request.getUnderWarranty())) {
                applyWarrantyZeroPriceToLines(repair);
            }
        }
        if (request.getRepairWarrantyEndDate() != null) repair.setRepairWarrantyEndDate(request.getRepairWarrantyEndDate());
        if (request.getInvoiceMethod() != null) repair.setInvoiceMethod(resolveInvoiceMethod(request.getInvoiceMethod()));
        if (request.getNote() != null) repair.setNote(trimToNull(request.getNote()));

        Repair saved = repairRepository.save(repair);

        auditLogService.logEvent(
                getCurrentUsername(), "UPDATE", "Repair", id,
                "SUCCESS", "Cập nhật lệnh sửa chữa " + repair.getRepairCode(), null, null
        );

        return toDetailResponse(repairRepository.findWithDetailsById(saved.getId()).orElse(saved));
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
                .note(trimToNull(request.getNote()))
                .build();

        RepairLine saved = repairLineRepository.save(line);
        recalculateTotalAmount(repair);

        return toLineResponse(saved);
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

    // =====================================================================
    // Helper: Tính lại tổng tiền
    // =====================================================================

    public void recalculateTotalAmount(Repair repair) {
        List<RepairLine> lines = repairLineRepository.findByRepairId(repair.getId());
        List<RepairFee> fees = repairFeeRepository.findByRepairId(repair.getId());

        BigDecimal lineTotal = lines.stream()
                .filter(l -> "ADD".equals(l.getActionType())) // Chỉ tính dòng ADD vào chi phí
                .map(l -> l.getUnitPrice().multiply(l.getQuantity()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal feeTotal = fees.stream()
                .map(RepairFee::getFeeAmount)
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
        return RepairResponse.builder()
                .id(repair.getId())
                .repairCode(repair.getRepairCode())
                .partnerId(repair.getPartnerId())
                .productId(repair.getProductId())
                .warehouseId(repair.getWarehouseId())
                .serialNumberId(repair.getSerialNumberId())
                .warrantyId(repair.getWarrantyId())
                .receivedDate(repair.getReceivedDate())
                .expectedDate(repair.getExpectedDate())
                .completedDate(repair.getCompletedDate())
                .repairStatus(repair.getRepairStatus())
                .issueDescription(repair.getIssueDescription())
                .underWarranty(repair.getUnderWarranty())
                .invoiceMethod(repair.getInvoiceMethod())
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

        return RepairResponse.builder()
                .id(repair.getId())
                .repairCode(repair.getRepairCode())
                .partnerId(repair.getPartnerId())
                .partnerName(partnerName)
                .partnerPhone(partnerPhone)
                .productId(repair.getProductId())
                .warehouseId(repair.getWarehouseId())
                .serialNumberId(repair.getSerialNumberId())
                .warrantyId(repair.getWarrantyId())
                .receivedDate(repair.getReceivedDate())
                .expectedDate(repair.getExpectedDate())
                .completedDate(repair.getCompletedDate())
                .repairWarrantyEndDate(repair.getRepairWarrantyEndDate())
                .repairStatus(repair.getRepairStatus())
                .issueDescription(repair.getIssueDescription())
                .diagnosisNote(repair.getDiagnosisNote())
                .solutionDescription(repair.getSolutionDescription())
                .underWarranty(repair.getUnderWarranty())
                .invoiceMethod(repair.getInvoiceMethod())
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
        if (line.getComponentVariantId() != null) {
            try {
                var variantOpt = productVariantRepository.findById(line.getComponentVariantId());
                if (variantOpt.isPresent()) {
                    componentName = variantOpt.get().getVariantName();
                    componentSku = variantOpt.get().getSku();
                }
            } catch (Exception ignored) { /* best-effort */ }
        }

        // Resolve serial number
        String serialNum = null;
        if (line.getSerialNumberId() != null) {
            try {
                var snOpt = serialNumberRepository.findById(line.getSerialNumberId());
                if (snOpt.isPresent()) {
                    serialNum = snOpt.get().getSerialNumber();
                }
            } catch (Exception ignored) { /* best-effort */ }
        }

        BigDecimal lineAmount = line.getUnitPrice().multiply(line.getQuantity());

        return RepairLineResponse.builder()
                .id(line.getId())
                .repairId(line.getRepair() != null ? line.getRepair().getId() : null)
                .componentVariantId(line.getComponentVariantId())
                .componentName(componentName)
                .componentSku(componentSku)
                .actionType(line.getActionType())
                .quantity(line.getQuantity())
                .unitPrice(line.getUnitPrice())
                .lineAmount(lineAmount)
                .isFreeWarranty(line.getIsFreeWarranty())
                .serialNumberId(line.getSerialNumberId())
                .serialNumber(serialNum)
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
    }

    private void validateLineRequest(RepairLineRequest request) {
        if (request.getComponentVariantId() == null) {
            throw new BusinessException("componentVariantId là bắt buộc");
        }
        if (!VALID_ACTION_TYPES.contains(request.getActionType().toUpperCase())) {
            throw new BusinessException("actionType phải là ADD hoặc REMOVE");
        }
        if (request.getQuantity() == null || request.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("quantity phải lớn hơn 0");
        }
    }

    private String generateRepairCode() {
        return codeGeneratorService.generateCode("REPAIRS", "repair_code", "SC", 6);
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
