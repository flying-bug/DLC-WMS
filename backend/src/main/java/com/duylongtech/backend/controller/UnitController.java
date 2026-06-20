package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.UnitDto;
import com.duylongtech.backend.service.UnitService;
import com.duylongtech.backend.service.AuditLogService;
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
    private final AuditLogService auditLogService;

    private String getClientIp(jakarta.servlet.http.HttpServletRequest request) {
        String ipAddress = request.getHeader("X-Forwarded-For");
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getRemoteAddr();
        }
        if (ipAddress != null && ipAddress.contains(",")) {
            ipAddress = ipAddress.split(",")[0].trim();
        }
        return ipAddress;
    }

    private String getCurrentUser() {
        return org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
    }

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
    public ResponseEntity<UnitDto> createUnit(@Valid @RequestBody UnitDto unitDto, jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            UnitDto created = unitService.createUnit(unitDto);
            String detailJson = auditLogService.buildChangeDetail(null, created, "Tạo mới đơn vị tính");
            auditLogService.logEvent(
                actor,
                "CREATE",
                "Unit",
                created.getId(),
                "SUCCESS",
                "Thêm mới đơn vị tính: " + created.getName(),
                ip,
                detailJson
            );
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            auditLogService.logEvent(
                actor,
                "CREATE",
                "Unit",
                null,
                "FAILED",
                "Thêm mới đơn vị tính: " + unitDto.getName() + " thất bại: " + e.getMessage(),
                ip,
                null
            );
            throw e;
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('unit:edit')")
    public ResponseEntity<UnitDto> updateUnit(@PathVariable Long id, @Valid @RequestBody UnitDto unitDto, jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            UnitDto before = unitService.getUnitById(id);
            UnitDto updated = unitService.updateUnit(id, unitDto);
            String detailJson = auditLogService.buildChangeDetail(before, updated, "Cập nhật đơn vị tính");
            auditLogService.logEvent(
                actor,
                "UPDATE",
                "Unit",
                id,
                "SUCCESS",
                "Cập nhật đơn vị tính: " + updated.getName(),
                ip,
                detailJson
            );
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            auditLogService.logEvent(
                actor,
                "UPDATE",
                "Unit",
                id,
                "FAILED",
                "Cập nhật đơn vị tính ID " + id + " thất bại: " + e.getMessage(),
                ip,
                null
            );
            throw e;
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('unit:delete')")
    public ResponseEntity<Void> deleteUnit(@PathVariable Long id, jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        String unitName = "ID " + id;
        UnitDto target = null;
        try {
            target = unitService.getUnitById(id);
            if (target != null) {
                unitName = target.getName();
            }
        } catch (Exception ignored) {}

        try {
            unitService.deleteUnit(id);
            String detailJson = auditLogService.buildChangeDetail(target, null, "Xóa đơn vị tính");
            auditLogService.logEvent(
                actor,
                "DELETE",
                "Unit",
                id,
                "SUCCESS",
                "Xóa đơn vị tính: " + unitName,
                ip,
                detailJson
            );
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            auditLogService.logEvent(
                actor,
                "DELETE",
                "Unit",
                id,
                "FAILED",
                "Xóa đơn vị tính " + unitName + " thất bại: " + e.getMessage(),
                ip,
                null
            );
            throw e;
        }
    }
}
