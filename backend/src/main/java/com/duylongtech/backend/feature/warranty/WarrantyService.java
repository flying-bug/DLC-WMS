package com.duylongtech.backend.feature.warranty;

import com.duylongtech.backend.feature.warranty.WarrantyResponse;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.repair.Repair;
import com.duylongtech.backend.feature.product.SerialNumber;
import com.duylongtech.backend.feature.warranty.Warranty;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.repair.RepairRepository;
import com.duylongtech.backend.feature.warranty.WarrantyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

public interface WarrantyService {
    Page<WarrantyResponse> getWarranties(String keyword, String status, LocalDate fromDate, LocalDate toDate,
                                                int page, int size);
    WarrantyResponse getWarrantyById(Long id);
}
