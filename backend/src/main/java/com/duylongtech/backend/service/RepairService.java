package com.duylongtech.backend.service;

import com.duylongtech.backend.constant.RepairActionType;
import com.duylongtech.backend.constant.RepairStatus;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.RepairFeeRequest;
import com.duylongtech.backend.dto.request.RepairLineRequest;
import com.duylongtech.backend.dto.request.RepairRequest;
import com.duylongtech.backend.dto.response.RepairFeeResponse;
import com.duylongtech.backend.dto.response.RepairLineResponse;
import com.duylongtech.backend.dto.response.RepairResponse;
import com.duylongtech.backend.entity.Repair;
import com.duylongtech.backend.entity.RepairFee;
import com.duylongtech.backend.entity.RepairLine;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.RepairFeeRepository;
import com.duylongtech.backend.repository.RepairLineRepository;
import com.duylongtech.backend.repository.RepairRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RepairService {

    private final RepairRepository repairRepository;
    private final RepairLineRepository repairLineRepository;
    private final RepairFeeRepository repairFeeRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public Page<RepairResponse> searchRepairs(String keyword, String status, LocalDate fromDate, LocalDate toDate, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1));
        return repairRepository.searchRepairTickets(keyword, status, fromDate, toDate, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public RepairResponse getRepairById(Long id) {
        Repair repair = repairRepository.findById(id)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));
        return toResponse(repair);
    }

    @Transactional
    public RepairResponse createRepair(RepairRequest request, Long userId) {
        String maxCode = repairRepository.findMaxRepairCode();
        int nextNum = 1;
        if (maxCode != null && maxCode.startsWith("SC-")) {
            try {
                nextNum = Integer.parseInt(maxCode.substring(3)) + 1;
            } catch (NumberFormatException ignored) {}
        }
        String repairCode = String.format("SC-%05d", nextNum);

        Repair repair = Repair.builder()
                .repairCode(repairCode)
                .partnerId(request.getPartnerId())
                .productId(request.getProductId())
                .serialNumberId(request.getSerialNumberId())
                .issueDescription(request.getIssueDescription())
                .underWarranty(request.getUnderWarranty())
                .invoiceMethod(request.getInvoiceMethod())
                .repairStatus(RepairStatus.DRAFT.name())
                .receivedDate(LocalDate.now())
                .totalAmount(BigDecimal.ZERO)
                .createdBy(userId)
                .build();

        Repair savedRepair = repairRepository.save(repair);
        
        auditLogService.logAction(
                "REPAIR",
                savedRepair.getId(),
                "CREATE",
                "Tạo lệnh sửa chữa mới: " + repairCode,
                userId
        );

        return toResponse(savedRepair);
    }

    @Transactional
    public RepairResponse updateRepair(Long id, RepairRequest request, Long userId) {
        Repair repair = repairRepository.findById(id)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));

        if (!RepairStatus.DRAFT.name().equals(repair.getRepairStatus()) &&
            !RepairStatus.QUOTATION.name().equals(repair.getRepairStatus())) {
            throw new BusinessException(SystemMessage.REP_CANNOT_UPDATE);
        }

        repair.setPartnerId(request.getPartnerId());
        repair.setProductId(request.getProductId());
        repair.setSerialNumberId(request.getSerialNumberId());
        repair.setIssueDescription(request.getIssueDescription());
        repair.setUnderWarranty(request.getUnderWarranty());
        repair.setInvoiceMethod(request.getInvoiceMethod());

        Repair updatedRepair = repairRepository.save(repair);
        
        auditLogService.logAction(
                "REPAIR",
                updatedRepair.getId(),
                "UPDATE",
                "Cập nhật lệnh sửa chữa",
                userId
        );

        return toResponse(updatedRepair);
    }

    @Transactional
    public RepairLineResponse addRepairLine(Long repairId, RepairLineRequest request, Long userId) {
        Repair repair = repairRepository.findById(repairId)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));

        if (!RepairStatus.DRAFT.name().equals(repair.getRepairStatus()) &&
            !RepairStatus.QUOTATION.name().equals(repair.getRepairStatus())) {
            throw new BusinessException(SystemMessage.REP_CANNOT_UPDATE);
        }

        BigDecimal unitPrice = request.getUnitPrice();
        if (Boolean.TRUE.equals(request.getIsFreeWarranty()) || Boolean.TRUE.equals(repair.getUnderWarranty())) {
            unitPrice = BigDecimal.ZERO;
        }

        RepairLine line = RepairLine.builder()
                .repairId(repair.getId())
                .componentVariantId(request.getComponentVariantId())
                .actionType(request.getActionType())
                .quantity(request.getQuantity())
                .unitPrice(unitPrice)
                .isFreeWarranty(request.getIsFreeWarranty() != null ? request.getIsFreeWarranty() : false)
                .serialNumberId(request.getSerialNumberId())
                .note(request.getNote())
                .build();

        RepairLine savedLine = repairLineRepository.save(line);

        // Update total amount
        recalculateTotalAmount(repair);

        auditLogService.logAction(
                "REPAIR_LINE",
                savedLine.getId(),
                "CREATE",
                "Thêm linh kiện vào lệnh sửa chữa",
                userId
        );

        return toLineResponse(savedLine);
    }
    
    @Transactional(readOnly = true)
    public List<RepairLineResponse> getRepairLines(Long repairId) {
        return repairLineRepository.findByRepairId(repairId).stream().map(this::toLineResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<RepairFeeResponse> getRepairFees(Long repairId) {
        return repairFeeRepository.findByRepairId(repairId).stream().map(this::toFeeResponse).toList();
    }

    @Transactional
    public RepairFeeResponse addRepairFee(Long repairId, RepairFeeRequest request, Long userId) {
        Repair repair = repairRepository.findById(repairId)
                .orElseThrow(() -> new BusinessException(SystemMessage.REP_NOT_FOUND));

        if (!RepairStatus.DRAFT.name().equals(repair.getRepairStatus()) &&
            !RepairStatus.QUOTATION.name().equals(repair.getRepairStatus())) {
            throw new BusinessException(SystemMessage.REP_CANNOT_UPDATE);
        }

        BigDecimal amount = request.getFeeAmount();
        if (Boolean.TRUE.equals(request.getIsFreeWarranty()) || Boolean.TRUE.equals(repair.getUnderWarranty())) {
            amount = BigDecimal.ZERO;
        }

        RepairFee fee = RepairFee.builder()
                .repairId(repair.getId())
                .feeName(request.getFeeName())
                .feeAmount(amount)
                .isFreeWarranty(request.getIsFreeWarranty() != null ? request.getIsFreeWarranty() : false)
                .note(request.getNote())
                .build();

        RepairFee savedFee = repairFeeRepository.save(fee);

        recalculateTotalAmount(repair);

        auditLogService.logAction(
                "REPAIR_FEE",
                savedFee.getId(),
                "CREATE",
                "Thêm phí dịch vụ vào lệnh sửa chữa",
                userId
        );

        return toFeeResponse(savedFee);
    }
    
    private void recalculateTotalAmount(Repair repair) {
        BigDecimal totalLines = repairLineRepository.findByRepairId(repair.getId()).stream()
                .filter(line -> RepairActionType.ADD.name().equals(line.getActionType()))
                .map(line -> line.getUnitPrice().multiply(line.getQuantity()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal totalFees = repairFeeRepository.findByRepairId(repair.getId()).stream()
                .map(RepairFee::getFeeAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        repair.setTotalAmount(totalLines.add(totalFees));
        repairRepository.save(repair);
    }

    private RepairResponse toResponse(Repair repair) {
        return RepairResponse.builder()
                .id(repair.getId())
                .repairCode(repair.getRepairCode())
                .partnerId(repair.getPartnerId())
                .productId(repair.getProductId())
                .serialNumberId(repair.getSerialNumberId())
                .issueDescription(repair.getIssueDescription())
                .repairStatus(repair.getRepairStatus())
                .underWarranty(repair.getUnderWarranty())
                .repairWarrantyEndDate(repair.getRepairWarrantyEndDate())
                .invoiceMethod(repair.getInvoiceMethod())
                .totalAmount(repair.getTotalAmount())
                .receivedDate(repair.getReceivedDate())
                .expectedDate(repair.getExpectedDate())
                .completedDate(repair.getCompletedDate())
                .diagnosisNote(repair.getDiagnosisNote())
                .solutionDescription(repair.getSolutionDescription())
                .note(repair.getNote())
                .build();
    }

    private RepairLineResponse toLineResponse(RepairLine line) {
        return RepairLineResponse.builder()
                .id(line.getId())
                .repairId(line.getRepairId())
                .componentVariantId(line.getComponentVariantId())
                .actionType(line.getActionType())
                .quantity(line.getQuantity())
                .unitPrice(line.getUnitPrice())
                .isFreeWarranty(line.getIsFreeWarranty())
                .serialNumberId(line.getSerialNumberId())
                .note(line.getNote())
                .build();
    }

    private RepairFeeResponse toFeeResponse(RepairFee fee) {
        return RepairFeeResponse.builder()
                .id(fee.getId())
                .repairId(fee.getRepairId())
                .feeName(fee.getFeeName())
                .feeAmount(fee.getFeeAmount())
                .isFreeWarranty(fee.getIsFreeWarranty())
                .note(fee.getNote())
                .build();
    }
}
