package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.WarrantyRequest;
import com.duylongtech.backend.dto.request.WarrantyStatusRequest;
import com.duylongtech.backend.dto.request.WarrantyLineRequest;
import com.duylongtech.backend.dto.response.WarrantyLineResponse;
import com.duylongtech.backend.dto.response.WarrantyResponse;
import com.duylongtech.backend.entity.Warranty;
import com.duylongtech.backend.entity.WarrantyLine;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.WarrantyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

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
                .partnerId(request.getPartnerId())
                .salesOrderId(request.getSalesOrderId())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .warrantyStatus(normalizeStatusOrDefault(request.getWarrantyStatus(), "APPROVED"))
                .note(trimToNull(request.getNote()))
                .build();
        
        List<WarrantyLine> lines = mapLines(request.getLines(), warranty);
        warranty.setLines(lines);

        return toResponse(warrantyRepository.save(warranty));
    }

    @Transactional
    public WarrantyResponse updateWarranty(Long id, WarrantyRequest request) {
        Warranty warranty = findWarrantyOrThrow(id);
        validateRequest(request, id);
        warranty.setWarrantyCode(resolveUpdateCode(id, request.getWarrantyCode(), warranty.getWarrantyCode()));
        warranty.setPartnerId(request.getPartnerId());
        warranty.setSalesOrderId(request.getSalesOrderId());
        warranty.setStartDate(request.getStartDate());
        warranty.setEndDate(request.getEndDate());
        warranty.setWarrantyStatus(normalizeStatusOrDefault(request.getWarrantyStatus(), warranty.getWarrantyStatus()));
        warranty.setNote(trimToNull(request.getNote()));

        warranty.getLines().clear();
        warranty.getLines().addAll(mapLines(request.getLines(), warranty));

        return toResponse(warrantyRepository.save(warranty));
    }

    private List<WarrantyLine> mapLines(List<WarrantyLineRequest> lineRequests, Warranty warranty) {
        if (lineRequests == null || lineRequests.isEmpty()) {
            return new java.util.ArrayList<>();
        }
        return lineRequests.stream().map(req -> WarrantyLine.builder()
                .warranty(warranty)
                .serialNumberId(req.getSerialNumberId())
                .productVariantId(req.getProductVariantId())
                .quantity(req.getQuantity())
                .startDate(req.getStartDate() != null ? req.getStartDate() : warranty.getStartDate())
                .endDate(req.getEndDate() != null ? req.getEndDate() : warranty.getEndDate())
                .warrantyStatus(normalizeStatusOrDefault(req.getWarrantyStatus(), warranty.getWarrantyStatus()))
                .build()
        ).collect(Collectors.toList());
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
        if (request.getLines() == null || request.getLines().isEmpty()) {
            throw new BusinessException("Phieu bao hanh phai co it nhat mot mat hang");
        }
        for (WarrantyLineRequest line : request.getLines()) {
            if (line.getSerialNumberId() == null && (line.getProductVariantId() == null || line.getQuantity() == null)) {
                throw new BusinessException("Phai cung cap Serial hoac SKU va so luong bao hanh cho moi mat hang");
            }
        }
        if (request.getPartnerId() == null) {
            throw new BusinessException("Khach hang bao hanh la bat buoc");
        }
        // Don ban hang lien quan co the khong bat buoc neu xuat ban truc tiep (POS)
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
        WarrantyResponse.WarrantyResponseBuilder builder = WarrantyResponse.builder()
                .id(warranty.getId())
                .warrantyCode(warranty.getWarrantyCode())
                .partnerId(warranty.getPartnerId())
                .salesOrderId(warranty.getSalesOrderId())
                .startDate(warranty.getStartDate())
                .endDate(warranty.getEndDate())
                .warrantyStatus(warranty.getWarrantyStatus())
                .note(warranty.getNote());

        if (warranty.getPartner() != null) {
            builder.partnerName(warranty.getPartner().getName());
            builder.partnerPhone(warranty.getPartner().getPhone());
            builder.partnerEmail(warranty.getPartner().getEmail());
            builder.partnerAddress(warranty.getPartner().getAddress());
        }

        if (warranty.getLines() != null && !warranty.getLines().isEmpty()) {
            List<WarrantyLineResponse> lineResponses = warranty.getLines().stream().map(line -> {
                WarrantyLineResponse.WarrantyLineResponseBuilder lineBuilder = WarrantyLineResponse.builder()
                        .id(line.getId())
                        .serialNumberId(line.getSerialNumberId())
                        .productVariantId(line.getProductVariantId())
                        .quantity(line.getQuantity())
                        .startDate(line.getStartDate())
                        .endDate(line.getEndDate())
                        .warrantyStatus(line.getWarrantyStatus());

                if (line.getSerialNumber() != null) {
                    lineBuilder.serialNumber(line.getSerialNumber().getSerialNumber());
                    if (line.getSerialNumber().getVariant() != null) {
                        lineBuilder.sku(line.getSerialNumber().getVariant().getSku());
                        lineBuilder.variantName(line.getSerialNumber().getVariant().getVariantName());
                        if (line.getSerialNumber().getVariant().getVariantName() == null && line.getSerialNumber().getVariant().getProduct() != null) {
                            lineBuilder.variantName(line.getSerialNumber().getVariant().getProduct().getProductName());
                        }
                    }
                } else if (line.getProductVariant() != null) {
                    lineBuilder.sku(line.getProductVariant().getSku());
                    lineBuilder.variantName(line.getProductVariant().getVariantName());
                    if (line.getProductVariant().getVariantName() == null && line.getProductVariant().getProduct() != null) {
                        lineBuilder.variantName(line.getProductVariant().getProduct().getProductName());
                    }
                }
                return lineBuilder.build();
            }).collect(Collectors.toList());
            builder.lines(lineResponses);
        }

        return builder.build();
    }

    private String resolveCreateCode(String requestedCode) {
        String code = trimToNull(requestedCode);
        if (code != null) {
            return code.toUpperCase();
        }
        return codeGeneratorService.generateCode("warranties", "warranty_code", "BH", 6);
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
