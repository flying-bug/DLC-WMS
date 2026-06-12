package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.UnitDto;
import com.duylongtech.backend.entity.Unit;
import com.duylongtech.backend.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UnitService {

    private final UnitRepository unitRepository;

    public Page<UnitDto> getAllUnits(String search, Pageable pageable) {
        Page<Unit> unitPage;
        if (search != null && !search.isEmpty()) {
            unitPage = unitRepository.findByNameContainingIgnoreCase(search, pageable);
        } else {
            unitPage = unitRepository.findAll(pageable);
        }
        return unitPage.map(this::mapToDto);
    }

    public UnitDto getUnitById(Long id) {
        Unit unit = unitRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn vị tính với ID: " + id));
        return mapToDto(unit);
    }

    @Transactional
    public UnitDto createUnit(UnitDto dto) {
        if (unitRepository.findByName(dto.getName()).isPresent()) {
            throw new RuntimeException("Tên đơn vị tính đã tồn tại!");
        }

        Unit unit = Unit.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .status(dto.getStatus() != null ? dto.getStatus() : "ACTIVE")
                .build();

        Unit savedUnit = unitRepository.save(unit);
        return mapToDto(savedUnit);
    }

    @Transactional
    public UnitDto updateUnit(Long id, UnitDto dto) {
        Unit unit = unitRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn vị tính với ID: " + id));

        if (!unit.getName().equals(dto.getName()) && unitRepository.findByName(dto.getName()).isPresent()) {
            throw new RuntimeException("Tên đơn vị tính đã tồn tại!");
        }

        unit.setName(dto.getName());
        unit.setDescription(dto.getDescription());
        if (dto.getStatus() != null) {
            unit.setStatus(dto.getStatus());
        }

        Unit updatedUnit = unitRepository.save(unit);
        return mapToDto(updatedUnit);
    }

    @Transactional
    public void deleteUnit(Long id) {
        if (!unitRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy đơn vị tính với ID: " + id);
        }
        // Có thể thay bằng soft delete nếu cần: unit.setStatus("INACTIVE")
        unitRepository.deleteById(id);
    }

    private UnitDto mapToDto(Unit unit) {
        return UnitDto.builder()
                .id(unit.getId())
                .name(unit.getName())
                .description(unit.getDescription())
                .status(unit.getStatus())
                .createdAt(unit.getCreatedAt())
                .updatedAt(unit.getUpdatedAt())
                .build();
    }
}
