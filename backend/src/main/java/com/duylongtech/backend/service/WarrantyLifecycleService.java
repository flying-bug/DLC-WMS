package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.WarrantyRequest;
import com.duylongtech.backend.dto.request.WarrantyStatusRequest;
import com.duylongtech.backend.dto.response.WarrantyResponse;
import com.duylongtech.backend.entity.Warranty;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.WarrantyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class WarrantyLifecycleService {

    private static final Set<String> VALID_STATUSES = Set.of(
            "DRAFT", "APPROVED", "POSTED", "CANCELLED", "EXPIRED", "VOIDED"
    );

    private final WarrantyRepository warrantyRepository;
    private final CodeGeneratorService codeGeneratorService;

    @Transactional
    public WarrantyResponse createWarranty(WarrantyRequest request) {
        validateRequest(request, null);
        Warranty warranty = Warranty.builder()
                .warrantyCode(resolveCreateCode(request.getWarrantyCode()))
                .serialNumberId(request.getSerialNumberId())
                .partnerId(request.getPartnerId())
                .salesOrderId(request.getSalesOrderId())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .warrantyStatus(normalizeStatusOrDefault(request.getWarrantyStatus(), "APPROVED"))
                .note(trimToNull(request.getNote()))
                .build();
        return toResponse(warrantyRepository.save(warranty));
    }

    @Transactional
    public WarrantyResponse updateWarranty(Long id, WarrantyRequest request) {
        Warranty warranty = findWarrantyOrThrow(id);
        validateRequest(request, id);
        warranty.setWarrantyCode(resolveUpdateCode(id, request.getWarrantyCode(), warranty.getWarrantyCode()));
        warranty.setSerialNumberId(request.getSerialNumberId());
        warranty.setPartnerId(request.getPartnerId());
        warranty.setSalesOrderId(request.getSalesOrderId());
        warranty.setStartDate(request.getStartDate());
        warranty.setEndDate(request.getEndDate());
        warranty.setWarrantyStatus(normalizeStatusOrDefault(request.getWarrantyStatus(), warranty.getWarrantyStatus()));
        warranty.setNote(trimToNull(request.getNote()));
        return toResponse(warrantyRepository.save(warranty));
    }

    @Transactional
    public WarrantyResponse updateWarrantyStatus(Long id, WarrantyStatusRequest request) {
        Warranty warranty = findWarrantyOrThrow(id);
        String status = normalizeStatusOrDefault(request != null ? request.getWarrantyStatus() : null, null);
        if (status == null || !VALID_STATUSES.contains(status)) {
            throw new BusinessException("Trang thai bao hanh khong hop le");
        }
        warranty.setWarrantyStatus(status);
        if (request != null && trimToNull(request.getNote()) != null) {
            warranty.setNote(trimToNull(request.getNote()));
        }
        return toResponse(warrantyRepository.save(warranty));
    }

    private Warranty findWarrantyOrThrow(Long id) {
        if (id == null) {
            throw new BusinessException("ID bao hanh la bat buoc");
        }
        return warrantyRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Khong tim thay phieu bao hanh"));
    }

    private void validateRequest(WarrantyRequest request, Long currentId) {
        if (request == null) {
            throw new BusinessException("Du lieu bao hanh la bat buoc");
        }
        if (request.getSerialNumberId() == null) {
            throw new BusinessException("Serial bao hanh la bat buoc");
        }
        if (request.getPartnerId() == null) {
            throw new BusinessException("Khach hang bao hanh la bat buoc");
        }
        if (request.getSalesOrderId() == null) {
            throw new BusinessException("Don ban hang lien quan la bat buoc");
        }
        if (request.getStartDate() == null || request.getEndDate() == null) {
            throw new BusinessException("Ngay bat dau va ngay het han bao hanh la bat buoc");
        }
        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new BusinessException("Ngay het han khong duoc truoc ngay bat dau");
        }
        String status = normalizeStatusOrDefault(request.getWarrantyStatus(), "APPROVED");
        if (!VALID_STATUSES.contains(status)) {
            throw new BusinessException("Trang thai bao hanh khong hop le");
        }
        String code = trimToNull(request.getWarrantyCode());
        if (code != null) {
            boolean duplicated = currentId == null
                    ? warrantyRepository.existsByWarrantyCode(code.toUpperCase())
                    : warrantyRepository.existsByWarrantyCodeAndIdNot(code.toUpperCase(), currentId);
            if (duplicated) {
                throw new BusinessException("Ma bao hanh da ton tai");
            }
        }
    }

    private WarrantyResponse toResponse(Warranty warranty) {
        return WarrantyResponse.builder()
                .id(warranty.getId())
                .warrantyCode(warranty.getWarrantyCode())
                .serialNumberId(warranty.getSerialNumberId())
                .partnerId(warranty.getPartnerId())
                .salesOrderId(warranty.getSalesOrderId())
                .startDate(warranty.getStartDate())
                .endDate(warranty.getEndDate())
                .warrantyStatus(warranty.getWarrantyStatus())
                .note(warranty.getNote())
                .build();
    }

    private String resolveCreateCode(String requestedCode) {
        String code = trimToNull(requestedCode);
        if (code != null) {
            return code.toUpperCase();
        }
        return codeGeneratorService.generateCode("WARRANTIES", "warranty_code", "BH", 6);
    }

    private String resolveUpdateCode(Long id, String requestedCode, String currentCode) {
        String code = trimToNull(requestedCode);
        if (code == null) {
            return currentCode;
        }
        String normalized = code.toUpperCase();
        if (warrantyRepository.existsByWarrantyCodeAndIdNot(normalized, id)) {
            throw new BusinessException("Ma bao hanh da ton tai");
        }
        return normalized;
    }

    private String normalizeStatusOrDefault(String status, String fallback) {
        String value = trimToNull(status);
        return value != null ? value.toUpperCase() : fallback;
    }

    private String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }
}
