package com.duylongtech.backend.feature.partner;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.feature.partner.SupplierRequest;
import com.duylongtech.backend.feature.partner.SupplierResponse;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.partner.PartnerLedgerRepository;
import com.duylongtech.backend.feature.partner.PartnerLedger;
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
