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
                .orElseThrow(() -> new BusinessException("Khong tim thay phieu bao hanh"));
        return toResponse(warranty, true);
    }

    private WarrantyResponse toResponse(Warranty warranty, boolean includeRepairs) {
        Partner partner = warranty.getPartner();
        SerialNumber serialNumber = warranty.getSerialNumber();
        ProductVariant variant = serialNumber != null ? serialNumber.getVariant() : null;
        List<Repair> repairs = repairRepository.findByWarrantyId(warranty.getId());

        return WarrantyResponse.builder()
                .id(warranty.getId())
                .warrantyCode(warranty.getWarrantyCode())
                .serialNumberId(warranty.getSerialNumberId())
                .serialNumber(serialNumber != null ? serialNumber.getSerialNumber() : null)
                .serialStatus(serialNumber != null ? serialNumber.getStatus() : null)
                .sku(variant != null ? variant.getSku() : null)
                .productName(variant != null ? variant.getVariantName() : null)
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
                .repairs(includeRepairs ? repairs.stream().map(this::toRepairSummary).toList() : null)
                .build();
    }

    private WarrantyResponse.RepairSummary toRepairSummary(Repair repair) {
        return WarrantyResponse.RepairSummary.builder()
                .id(repair.getId())
                .repairCode(repair.getRepairCode())
                .receivedDate(repair.getReceivedDate())
                .repairStatus(repair.getRepairStatus())
                .build();
    }

    private String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }
}
