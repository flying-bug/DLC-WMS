package com.duylongtech.backend.service;

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

public interface WarrantyService {
    Page<WarrantyResponse> getWarranties(String keyword, String status, LocalDate fromDate, LocalDate toDate,
                                                int page, int size);
    WarrantyResponse getWarrantyById(Long id);
}
