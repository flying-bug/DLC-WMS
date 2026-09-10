package com.duylongtech.backend.service.impl;

import com.duylongtech.backend.service.*;

import com.duylongtech.backend.dto.response.WarrantyResponse;
import com.duylongtech.backend.constant.SystemMessage;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WarrantyServiceImpl  implements WarrantyService {

    private final WarrantyRepository warrantyRepository;
    private final RepairRepository repairRepository;
    private final com.duylongtech.backend.mapper.WarrantyMapper warrantyMapper;

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
            throw new BusinessException(SystemMessage.WARR_ERR_009.getMessage());
        }
        Warranty warranty = warrantyRepository.findWithDetailsById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu bảo hành"));
        return toResponse(warranty, true);
    }

    private WarrantyResponse toResponse(Warranty warranty, boolean includeRepairs) {
        WarrantyResponse response = warrantyMapper.toResponse(warranty);
        
        Partner partner = warranty.getPartner();
        if (partner != null) {
            response.setPartnerName(partner.getName());
            response.setPartnerPhone(partner.getPhone());
            response.setPartnerEmail(partner.getEmail());
            response.setPartnerAddress(partner.getAddress());
        }

        if (warranty.getExportSlip() != null) {
            response.setExportSlipCode(warranty.getExportSlip().getDocCode());
        }

        List<Repair> repairs = repairRepository.findByWarrantyId(warranty.getId());
        response.setRepairCount(repairs.size());
        
        if (includeRepairs) {
            response.setRepairs(repairs.stream().map(this::toRepairSummary).toList());
        }

        if (warranty.getLines() != null && !warranty.getLines().isEmpty()) {
            List<com.duylongtech.backend.dto.response.WarrantyLineResponse> lineResponses = warranty.getLines().stream().map(line -> {
                com.duylongtech.backend.dto.response.WarrantyLineResponse lineResp = warrantyMapper.toLineResponse(line);
                
                Long productId = null;
                String productName = null;
                
                if (line.getSerialNumber() != null) {
                    lineResp.setSerialNumber(line.getSerialNumber().getSerialNumber());
                    if (line.getSerialNumber().getVariant() != null) {
                        ProductVariant v = line.getSerialNumber().getVariant();
                        lineResp.setSku(v.getSku());
                        lineResp.setVariantName(v.getVariantName());
                        if (v.getProduct() != null) {
                            productId = v.getProduct().getId();
                            productName = v.getProduct().getProductName();
                        }
                    }
                } else if (line.getProductVariant() != null) {
                    ProductVariant v = line.getProductVariant();
                    lineResp.setSku(v.getSku());
                    lineResp.setVariantName(v.getVariantName());
                    if (v.getProduct() != null) {
                        productId = v.getProduct().getId();
                        productName = v.getProduct().getProductName();
                    }
                }
                lineResp.setProductId(productId);
                lineResp.setProductName(productName);
                return lineResp;
            }).collect(Collectors.toList());
            response.setLines(lineResponses);
        }

        return response;
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
