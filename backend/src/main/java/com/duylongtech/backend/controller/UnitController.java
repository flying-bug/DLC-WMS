package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.UnitDto;
import com.duylongtech.backend.service.UnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/units")
@RequiredArgsConstructor
public class UnitController {

    private final UnitService unitService;

    @GetMapping
    @PreAuthorize("hasAuthority('unit:view')")
    public ResponseEntity<Page<UnitDto>> getAllUnits(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(unitService.getAllUnits(search, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('unit:view')")
    public ResponseEntity<UnitDto> getUnitById(@PathVariable Long id) {
        return ResponseEntity.ok(unitService.getUnitById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('unit:add')")
    public ResponseEntity<UnitDto> createUnit(@RequestBody UnitDto unitDto) {
        return ResponseEntity.ok(unitService.createUnit(unitDto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('unit:edit')")
    public ResponseEntity<UnitDto> updateUnit(@PathVariable Long id, @RequestBody UnitDto unitDto) {
        return ResponseEntity.ok(unitService.updateUnit(id, unitDto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('unit:delete')")
    public ResponseEntity<Void> deleteUnit(@PathVariable Long id) {
        unitService.deleteUnit(id);
        return ResponseEntity.noContent().build();
    }
}
