package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.response.WarrantyResponse;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.entity.ProductVariant;
import com.duylongtech.backend.entity.Repair;
import com.duylongtech.backend.entity.SerialNumber;
import com.duylongtech.backend.entity.Warranty;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.RepairRepository;
import com.duylongtech.backend.repository.WarrantyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WarrantyService {

    private final WarrantyRepository warrantyRepository;
    private final RepairRepository repairRepository;

    @Transactional(readOnly = true)
    public Page<WarrantyResponse> getWarranties(String keyword, String status, LocalDate fromDate, LocalDate toDate,
                                                int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1));
        return warrantyRepository.searchWarranties(trimToNull(keyword), trimToNull(status), fromDate, toDate, pageable)
                .map(warranty -> toResponse(warranty, false));
    }

    @Transactional(readOnly = true)
    public WarrantyResponse getWarrantyById(Long id) {
        if (id == null) {
            throw new BusinessException("ID bao hanh la bat buoc");
        }
        Warranty warranty = warrantyRepository.findWithDetailsById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu bảo hành"));
        return toResponse(warranty, true);
    }

    private WarrantyResponse toResponse(Warranty warranty, boolean includeRepairs) {
        Partner partner = warranty.getPartner();
        List<Repair> repairs = repairRepository.findByWarrantyId(warranty.getId());

        WarrantyResponse.WarrantyResponseBuilder builder = WarrantyResponse.builder()
                .id(warranty.getId())
                .warrantyCode(warranty.getWarrantyCode())
                .partnerId(warranty.getPartnerId())
                .partnerName(partner != null ? partner.getName() : null)
                .partnerPhone(partner != null ? partner.getPhone() : null)
                .partnerEmail(partner != null ? partner.getEmail() : null)
                .partnerAddress(partner != null ? partner.getAddress() : null)
                .salesOrderId(warranty.getSalesOrderId())
                .startDate(warranty.getStartDate())
                .endDate(warranty.getEndDate())
                .warrantyStatus(warranty.getWarrantyStatus())
                .repairCount(repairs.size())
                .repairs(includeRepairs ? repairs.stream().map(this::toRepairSummary).toList() : null);

        if (warranty.getLines() != null && !warranty.getLines().isEmpty()) {
            List<com.duylongtech.backend.dto.response.WarrantyLineResponse> lineResponses = warranty.getLines().stream().map(line -> {
                com.duylongtech.backend.dto.response.WarrantyLineResponse.WarrantyLineResponseBuilder lineBuilder = com.duylongtech.backend.dto.response.WarrantyLineResponse.builder()
                        .id(line.getId())
                        .serialNumberId(line.getSerialNumberId())
                        .productVariantId(line.getProductVariantId())
                        .quantity(line.getQuantity())
                        .startDate(line.getStartDate())
                        .endDate(line.getEndDate())
                        .warrantyStatus(line.getWarrantyStatus());

                Long productId = null;
                String productName = null;

                if (line.getSerialNumber() != null) {
                    lineBuilder.serialNumber(line.getSerialNumber().getSerialNumber());
                    if (line.getSerialNumber().getVariant() != null) {
                        ProductVariant v = line.getSerialNumber().getVariant();
                        lineBuilder.sku(v.getSku());
                        lineBuilder.variantName(v.getVariantName());
                        if (v.getProduct() != null) {
                            productId = v.getProduct().getId();
                            productName = v.getProduct().getProductName();
                        }
                    }
                } else if (line.getProductVariant() != null) {
                    ProductVariant v = line.getProductVariant();
                    lineBuilder.sku(v.getSku());
                    lineBuilder.variantName(v.getVariantName());
                    if (v.getProduct() != null) {
                        productId = v.getProduct().getId();
                        productName = v.getProduct().getProductName();
                    }
                }
                lineBuilder.productId(productId);
                lineBuilder.productName(productName);
                return lineBuilder.build();
            }).collect(java.util.stream.Collectors.toList());
            builder.lines(lineResponses);
        }

        return builder.build();
    }

    private WarrantyResponse.RepairSummary toRepairSummary(Repair repair) {
        return WarrantyResponse.RepairSummary.builder()
                .id(repair.getId())
                .repairCode(repair.getRepairCode())
                .receivedDate(repair.getReceivedDate())
                .repairStatus(repair.getRepairStatus())
                .issueDescription(repair.getIssueDescription())
                .totalAmount(repair.getTotalAmount())
                .responsiblePerson(repair.getResponsiblePerson())
                .build();
    }

    private String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }
}
