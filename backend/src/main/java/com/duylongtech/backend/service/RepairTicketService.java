package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.RepairTicketRequest;
import com.duylongtech.backend.dto.response.RepairTicketResponse;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.entity.ProductVariant;
import com.duylongtech.backend.entity.Repair;
import com.duylongtech.backend.entity.SerialNumber;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.entity.Warranty;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.dto.request.RepairLineRequest;
import com.duylongtech.backend.dto.response.RepairLineResponse;
import com.duylongtech.backend.entity.RepairLine;
import com.duylongtech.backend.repository.RepairRepository;
import com.duylongtech.backend.repository.ProductVariantRepository;
import com.duylongtech.backend.repository.UserRepository;
import com.duylongtech.backend.repository.WarrantyRepository;
import lombok.RequiredArgsConstructor;
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
import java.util.Set;

@Service
@RequiredArgsConstructor
public class RepairTicketService {

    private static final Set<String> VALID_STATUSES = Set.of(
            "DRAFT", "SUBMITTED", "APPROVED", "POSTED", "CANCELLED", "RECEIVED", "REPAIRING", "WAITING_FOR_PARTS", "READY_FOR_PICKUP", "COMPLETED"
    );

    private final RepairRepository repairRepository;
    private final WarrantyRepository warrantyRepository;
    private final UserRepository userRepository;
    private final ProductVariantRepository productVariantRepository;

    @Transactional(readOnly = true)
    public Page<RepairTicketResponse> getRepairTickets(String keyword, String status, LocalDate fromDate,
                                                       LocalDate toDate, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1));
        return repairRepository.searchRepairs(trimToNull(keyword), normalizeStatus(status), pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public RepairTicketResponse getRepairTicketById(Long id) {
        return toResponse(findRepairOrThrow(id));
    }

    @Transactional
    public RepairTicketResponse createRepairTicket(RepairTicketRequest request) {
        validateRequest(request, null);
        Warranty warranty = resolveWarranty(request.getWarrantyId());
        Long partnerId = request.getPartnerId() != null ? request.getPartnerId() : warranty.getPartnerId();
        Long serialNumberId = request.getSerialNumberId() != null ? request.getSerialNumberId() : warranty.getSerialNumberId();

        Repair repair = Repair.builder()
                .repairCode(resolveCreateCode(request.getRepairCode()))
                .warrantyId(warranty.getId())
                .partnerId(partnerId)
                .serialNumberId(serialNumberId)
                .receivedDate(request.getReceivedDate())
                .expectedDate(request.getExpectedDate())
                .completedDate(resolveCompletedDate(request.getRepairStatus(), request.getCompletedDate()))
                .repairStatus(normalizeStatusOrDefault(request.getRepairStatus(), "RECEIVED"))
                .issueDescription(trimToNull(request.getIssueDescription()))
                .diagnosisNote(trimToNull(request.getDiagnosisNote()))
                .solutionDescription(trimToNull(request.getResolutionNote()))
                .repairCost(nonNegativeCost(request.getRepairCost()))
                .note(trimToNull(request.getNote()))
                .createdBy(resolveCurrentUserId())
                .build();

        if (request.getRepairLines() != null) {
            if (repair.getRepairLines() == null) {
                repair.setRepairLines(new java.util.ArrayList<>());
            }
            for (RepairLineRequest lr : request.getRepairLines()) {
                ProductVariant variant = productVariantRepository.findById(lr.getComponentVariantId())
                        .orElseThrow(() -> new BusinessException("Khong tim thay linh kien " + lr.getComponentVariantId()));
                RepairLine line = RepairLine.builder()
                        .repair(repair)
                        .componentVariant(variant)
                        .quantity(lr.getQuantity())
                        .unitPrice(lr.getUnitPrice() != null ? lr.getUnitPrice() : BigDecimal.ZERO)
                        .isWarrantyCovered(lr.getIsWarrantyCovered() != null ? lr.getIsWarrantyCovered() : false)
                        .note(trimToNull(lr.getNote()))
                        .build();
                repair.getRepairLines().add(line);
            }
        }

        return toResponse(repairRepository.save(repair));
    }

    @Transactional
    public RepairTicketResponse updateRepairTicket(Long id, RepairTicketRequest request) {
        Repair repair = findRepairOrThrow(id);
        validateRequest(request, id);
        Warranty warranty = resolveWarranty(request.getWarrantyId() != null ? request.getWarrantyId() : repair.getWarrantyId());

        repair.setRepairCode(resolveUpdateCode(id, request.getRepairCode(), repair.getRepairCode()));
        repair.setWarrantyId(warranty.getId());
        repair.setPartnerId(request.getPartnerId() != null ? request.getPartnerId() : warranty.getPartnerId());
        repair.setSerialNumberId(request.getSerialNumberId() != null ? request.getSerialNumberId() : warranty.getSerialNumberId());
        repair.setReceivedDate(request.getReceivedDate());
        repair.setExpectedDate(request.getExpectedDate());
        repair.setRepairStatus(normalizeStatusOrDefault(request.getRepairStatus(), repair.getRepairStatus()));
        repair.setCompletedDate(resolveCompletedDate(repair.getRepairStatus(), request.getCompletedDate()));
        repair.setIssueDescription(trimToNull(request.getIssueDescription()));
        repair.setDiagnosisNote(trimToNull(request.getDiagnosisNote()));
        repair.setSolutionDescription(trimToNull(request.getResolutionNote()));
        repair.setRepairCost(nonNegativeCost(request.getRepairCost()));
        repair.setNote(trimToNull(request.getNote()));

        repair.getRepairLines().clear();
        if (request.getRepairLines() != null) {
            for (RepairLineRequest lr : request.getRepairLines()) {
                ProductVariant variant = productVariantRepository.findById(lr.getComponentVariantId())
                        .orElseThrow(() -> new BusinessException("Khong tim thay linh kien " + lr.getComponentVariantId()));
                RepairLine line = RepairLine.builder()
                        .repair(repair)
                        .componentVariant(variant)
                        .quantity(lr.getQuantity())
                        .unitPrice(lr.getUnitPrice() != null ? lr.getUnitPrice() : BigDecimal.ZERO)
                        .isWarrantyCovered(lr.getIsWarrantyCovered() != null ? lr.getIsWarrantyCovered() : false)
                        .note(trimToNull(lr.getNote()))
                        .build();
                repair.getRepairLines().add(line);
            }
        }

        return toResponse(repairRepository.save(repair));
    }

    private Repair findRepairOrThrow(Long id) {
        if (id == null) {
            throw new BusinessException("ID phieu sua chua la bat buoc");
        }
        return repairRepository.findWithDetailsById(id)
                .orElseThrow(() -> new BusinessException("Khong tim thay phieu sua chua"));
    }

    private Warranty resolveWarranty(Long warrantyId) {
        if (warrantyId == null) {
            throw new BusinessException("Phieu sua chua phai lien ket voi bao hanh");
        }
        return warrantyRepository.findById(warrantyId)
                .orElseThrow(() -> new BusinessException("Khong tim thay phieu bao hanh"));
    }

    private void validateRequest(RepairTicketRequest request, Long currentId) {
        if (request == null) {
            throw new BusinessException("Du lieu phieu sua chua la bat buoc");
        }
        if (request.getReceivedDate() == null) {
            throw new BusinessException("Ngay tiep nhan la bat buoc");
        }
        if (trimToNull(request.getIssueDescription()) == null) {
            throw new BusinessException("Mo ta loi la bat buoc");
        }
        String status = normalizeStatusOrDefault(request.getRepairStatus(), "RECEIVED");
        if (!VALID_STATUSES.contains(status)) {
            throw new BusinessException("Trang thai phieu sua chua khong hop le");
        }
        if (request.getCompletedDate() != null && request.getCompletedDate().isBefore(request.getReceivedDate())) {
            throw new BusinessException("Ngay hoan tat khong duoc truoc ngay tiep nhan");
        }
        String repairCode = trimToNull(request.getRepairCode());
        if (repairCode != null) {
            boolean duplicated = currentId == null
                    ? repairRepository.existsByRepairCode(repairCode)
                    : repairRepository.existsByRepairCodeAndIdNot(repairCode, currentId);
            if (duplicated) {
                throw new BusinessException("Ma phieu sua chua da ton tai");
            }
        }
    }

    private RepairTicketResponse toResponse(Repair repair) {
        Warranty warranty = repair.getWarranty();
        Partner partner = warranty != null ? warranty.getPartner() : null;
        SerialNumber serialNumber = warranty != null ? warranty.getSerialNumber() : null;
        ProductVariant variant = serialNumber != null ? serialNumber.getVariant() : null;

        return RepairTicketResponse.builder()
                .id(repair.getId())
                .repairCode(repair.getRepairCode())
                .warrantyId(repair.getWarrantyId())
                .warrantyCode(warranty != null ? warranty.getWarrantyCode() : null)
                .partnerId(repair.getPartnerId())
                .partnerName(partner != null ? partner.getName() : null)
                .partnerPhone(partner != null ? partner.getPhone() : null)
                .serialNumberId(repair.getSerialNumberId())
                .serialNumber(serialNumber != null ? serialNumber.getSerialNumber() : null)
                .serialStatus(serialNumber != null ? serialNumber.getStatus() : null)
                .sku(variant != null ? variant.getSku() : null)
                .productName(variant != null ? variant.getVariantName() : null)
                .receivedDate(repair.getReceivedDate())
                .expectedDate(repair.getExpectedDate())
                .completedDate(repair.getCompletedDate())
                .repairStatus(repair.getRepairStatus())
                .issueDescription(repair.getIssueDescription())
                .diagnosisNote(repair.getDiagnosisNote())
                .resolutionNote(repair.getSolutionDescription())
                .repairCost(repair.getRepairCost())
                .note(repair.getNote())
                .createdBy(repair.getCreatedBy())
                .repairLines(repair.getRepairLines().stream().map(this::toLineResponse).toList())
                .build();
    }

    private RepairLineResponse toLineResponse(RepairLine line) {
        return RepairLineResponse.builder()
                .id(line.getId())
                .componentVariantId(line.getComponentVariant().getId())
                .sku(line.getComponentVariant().getSku())
                .variantName(line.getComponentVariant().getVariantName())
                .quantity(line.getQuantity())
                .unitPrice(line.getUnitPrice())
                .isFreeWarranty(line.getIsWarrantyCovered())
                .note(line.getNote())
                .build();
    }

    private String resolveCreateCode(String requestedCode) {
        String code = trimToNull(requestedCode);
        if (code != null) {
            return code.toUpperCase();
        }
        return "SC" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
    }

    private String resolveUpdateCode(Long id, String requestedCode, String currentCode) {
        String code = trimToNull(requestedCode);
        if (code == null) {
            return currentCode;
        }
        String normalized = code.toUpperCase();
        if (repairRepository.existsByRepairCodeAndIdNot(normalized, id)) {
            throw new BusinessException("Ma phieu sua chua da ton tai");
        }
        return normalized;
    }

    private LocalDate resolveCompletedDate(String status, LocalDate requestedCompletedDate) {
        if (requestedCompletedDate != null) {
            return requestedCompletedDate;
        }
        return "POSTED".equals(status) ? LocalDate.now() : null;
    }

    private BigDecimal nonNegativeCost(BigDecimal value) {
        BigDecimal cost = value != null ? value : BigDecimal.ZERO;
        if (cost.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Chi phi sua chua khong duoc am");
        }
        return cost;
    }

    private Long resolveCurrentUserId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .map(User::getId)
                .orElse(1L);
    }

    private String normalizeStatus(String status) {
        String value = trimToNull(status);
        return value != null ? value.toUpperCase() : null;
    }

    private String normalizeStatusOrDefault(String status, String fallback) {
        String normalized = normalizeStatus(status);
        return normalized != null ? normalized : fallback;
    }

    private String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }
}
