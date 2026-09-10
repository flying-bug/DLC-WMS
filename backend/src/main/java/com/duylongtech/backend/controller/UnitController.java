package com.duylongtech.backend.controller;

import com.duylongtech.backend.annotation.Auditable;
import com.duylongtech.backend.enums.AuditAction;
import com.duylongtech.backend.dto.request.UnitRequest;
import com.duylongtech.backend.dto.response.UnitResponse;
import com.duylongtech.backend.service.UnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/units")
@RequiredArgsConstructor
public class UnitController {

    private final UnitService unitService;

    @GetMapping
    @PreAuthorize("hasAuthority('unit:view')")
    public ResponseEntity<Page<UnitResponse>> getAllUnits(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(unitService.getAllUnits(search, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('unit:view')")
    public ResponseEntity<UnitResponse> getUnitById(@PathVariable Long id) {
        return ResponseEntity.ok(unitService.getUnitById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('unit:add')")
    @Auditable(action = AuditAction.CREATE, entityName = "Unit", actionDescription = "Thêm mới đơn vị tính")
    public ResponseEntity<UnitResponse> createUnit(@Valid @RequestBody UnitRequest unitDto) {
        return ResponseEntity.ok(unitService.createUnit(unitDto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('unit:edit')")
    @Auditable(action = AuditAction.UPDATE, entityName = "Unit", actionDescription = "Cập nhật đơn vị tính")
    public ResponseEntity<UnitResponse> updateUnit(@PathVariable Long id, @Valid @RequestBody UnitRequest unitDto) {
        return ResponseEntity.ok(unitService.updateUnit(id, unitDto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('unit:delete')")
    @Auditable(action = AuditAction.DELETE, entityName = "Unit", actionDescription = "Xóa đơn vị tính")
    public ResponseEntity<Void> deleteUnit(@PathVariable Long id) {
        unitService.deleteUnit(id);
        return ResponseEntity.noContent().build();
    }
}
