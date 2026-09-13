package com.duylongtech.backend.feature.product;

import com.duylongtech.backend.feature.product.UnitRequest;
import com.duylongtech.backend.feature.product.UnitResponse;
import com.duylongtech.backend.feature.product.Unit;
import com.duylongtech.backend.feature.product.UnitRepository;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.constant.SystemMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

public interface UnitService {
    Page<UnitResponse> getAllUnits(String search, Pageable pageable);
    UnitResponse getUnitById(Long id);
    UnitResponse createUnit(UnitRequest dto);
    UnitResponse updateUnit(Long id, UnitRequest dto);
    void deleteUnit(Long id);
}
