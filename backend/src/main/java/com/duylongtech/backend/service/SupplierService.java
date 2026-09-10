package com.duylongtech.backend.service;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.SupplierRequest;
import com.duylongtech.backend.dto.response.SupplierResponse;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.PartnerRepository;
import com.duylongtech.backend.repository.PartnerLedgerRepository;
import com.duylongtech.backend.entity.PartnerLedger;
import lombok.RequiredArgsConstructor;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public interface SupplierService {
    List<SupplierResponse> getAllSuppliers(String keyword);
    List<SupplierResponse> getAllSuppliers(String keyword, String status);
    SupplierResponse getSupplierById(Long id);
    SupplierResponse createSupplier(SupplierRequest req);
    SupplierResponse updateSupplier(Long id, SupplierRequest req);
    void deleteSupplier(Long id);
}
