package com.duylongtech.backend.service.impl;

import com.duylongtech.backend.service.*;

import com.duylongtech.backend.dto.request.UnitRequest;
import com.duylongtech.backend.dto.response.UnitResponse;
import com.duylongtech.backend.entity.Unit;
import com.duylongtech.backend.repository.UnitRepository;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.mapper.UnitMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UnitServiceImpl  implements UnitService {

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

        Unit unit = unitMapper.toEntity(dto);
        if (unit.getStatus() == null) {
            unit.setStatus("ACTIVE");
        }

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

        unitMapper.updateEntity(unit, dto);

        Unit updatedUnit = unitRepository.save(unit);
        return unitMapper.toResponse(updatedUnit);
    }

    @Transactional
    public void deleteUnit(Long id) {
        if (!unitRepository.existsById(id)) {
            throw new BusinessException(SystemMessage.UNIT_NOT_FOUND);
        }
        // Có thể thay bằng soft delete nếu cần: unit.setStatus("INACTIVE")
        unitRepository.deleteById(id);
    }
}
