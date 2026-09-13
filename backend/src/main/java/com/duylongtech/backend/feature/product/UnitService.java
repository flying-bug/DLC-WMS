package com.duylongtech.backend.feature.product;

import com.duylongtech.backend.feature.product.UnitRequest;
import com.duylongtech.backend.feature.product.UnitResponse;
import com.duylongtech.backend.feature.product.Unit;
import com.duylongtech.backend.feature.product.UnitRepository;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.feature.product.UnitMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.Unit;
import com.duylongtech.backend.feature.product.UnitMapper;
import com.duylongtech.backend.feature.product.UnitRepository;
import com.duylongtech.backend.feature.product.UnitRequest;
import com.duylongtech.backend.feature.product.UnitResponse;
import com.duylongtech.backend.feature.product.UnitService;

@Service
@RequiredArgsConstructor
public class UnitService {

    private final UnitRepository unitRepository;
    private final UnitMapper unitMapper;

    public Page<UnitResponse> getAllUnits(String search, Pageable pageable) {
        Page<Unit> unitPage;
        if (search != null && !search.isEmpty()) {
            unitPage = unitRepository.findByNameContainingIgnoreCase(search, pageable);
        } else {
            unitPage = unitRepository.findAll(pageable);
        }
        return unitPage.map(unitMapper::toResponse);
    }

    public UnitResponse getUnitById(Long id) {
        Unit unit = unitRepository.findById(id)
                .orElseThrow(() -> new BusinessException(SystemMessage.UNIT_NOT_FOUND));
        return unitMapper.toResponse(unit);
    }

    @Transactional
    public UnitResponse createUnit(UnitRequest dto) {
        if (unitRepository.findByName(dto.getName()).isPresent()) {
            throw new BusinessException(SystemMessage.UNIT_EXISTS);
        }

        Unit unit = new Unit();
        unit.initUnit(dto.getName(), dto.getDescription(), null);

        Unit savedUnit = unitRepository.save(unit);
        return unitMapper.toResponse(savedUnit);
    }

    @Transactional
    public UnitResponse updateUnit(Long id, UnitRequest dto) {
        Unit unit = unitRepository.findById(id)
                .orElseThrow(() -> new BusinessException(SystemMessage.UNIT_NOT_FOUND));

        if (!unit.getName().equals(dto.getName()) && unitRepository.findByName(dto.getName()).isPresent()) {
            throw new BusinessException(SystemMessage.UNIT_EXISTS);
        }

        unit.updateDetails(dto.getName(), dto.getDescription());

        Unit updatedUnit = unitRepository.save(unit);
        return unitMapper.toResponse(updatedUnit);
    }

    @Transactional
    public void deleteUnit(Long id) {
        if (!unitRepository.existsById(id)) {
            throw new BusinessException(SystemMessage.UNIT_NOT_FOUND);
        }
        // Có thể thay bằng soft delete nếu cần: unit.setStatus(com.duylongtech.backend.enums.EntityStatus.INACTIVE.name())
        unitRepository.deleteById(id);
    }
}
