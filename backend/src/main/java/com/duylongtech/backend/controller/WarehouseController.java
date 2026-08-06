package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.WarehouseRequest;
import com.duylongtech.backend.dto.response.WarehouseDetailResponse;
import com.duylongtech.backend.dto.response.WarehouseResponse;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.service.AuditLogService;
import com.duylongtech.backend.service.WarehouseService;
import com.duylongtech.backend.repository.UserRepository;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;
import com.duylongtech.backend.dto.response.WarehouseStockAiRow;

@RestController
@RequestMapping("/api/v1/warehouses")
@RequiredArgsConstructor
public class WarehouseController {

    private final WarehouseService warehouseService;
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;

    // ──────────────────────────────────────────────────────────
    // Utility methods (following UnitController pattern)
    // ──────────────────────────────────────────────────────────

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

    private String getCurrentUsername() {
        return org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
    }

    private Long getCurrentUserId() {
        org.springframework.security.core.Authentication authentication = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return userDetails.getId();
        }

        String username = getCurrentUsername();
        return userRepository.findByUsername(username)
                .or(() -> userRepository.findByEmail(username))
                .map(User::getId)
                .orElse(null);
    }

    // ──────────────────────────────────────────────────────────
    private Map<String, Object> warehouseAuditSnapshot(WarehouseResponse warehouse) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        if (warehouse == null) {
            return snapshot;
        }
        snapshot.put("code", warehouse.getCode());
        snapshot.put("name", warehouse.getName());
        snapshot.put("address", warehouse.getAddress());
        snapshot.put("type", warehouse.getType());
        snapshot.put("status", warehouse.getStatus());
        return snapshot;
    }

    private Map<String, Object> warehouseAuditSnapshot(WarehouseDetailResponse warehouse) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        if (warehouse == null) {
            return snapshot;
        }
        snapshot.put("code", warehouse.getCode());
        snapshot.put("name", warehouse.getName());
        snapshot.put("address", warehouse.getAddress());
        snapshot.put("type", warehouse.getType());
        snapshot.put("status", warehouse.getStatus());
        return snapshot;
    }
    // US2: GET - Danh sách kho
    // ──────────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAuthority('warehouse_master:view') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Page<WarehouseResponse>>> getWarehouses(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity
                .ok(ApiResponse.success(warehouseService.getWarehouses(search, status, pageable)));
    }

    // ──────────────────────────────────────────────────────────
    // US2: Xuất Excel danh sách kho
    // ──────────────────────────────────────────────────────────

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('warehouse_master:export') or hasRole('MANAGER')")
    public ResponseEntity<byte[]> exportWarehouses(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            org.springframework.security.core.Authentication authentication) {

        String exporterName = authentication != null ? authentication.getName() : "System";
        byte[] excelBytes = warehouseService.exportWarehousesToExcel(search, status, exporterName);

        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        String timestamp = java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String filename = "DLC_WMS_Danh_Sach_Kho_" + timestamp + ".xlsx";
        headers.add("Content-Disposition", "attachment; filename=\"" + filename + "\"");

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(org.springframework.http.MediaType
                        .parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }

    // ──────────────────────────────────────────────────────────
    // US2: GET - Chi tiết kho kèm metrics
    // ──────────────────────────────────────────────────────────

    @GetMapping("/{id}/metrics")
    @PreAuthorize("hasAuthority('warehouse_master:view') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<WarehouseDetailResponse>> getWarehouseDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(warehouseService.getWarehouseDetail(id)));
    }

    // ──────────────────────────────────────────────────────────
    // US5: GET - Lịch sử thay đổi kho (Audit Logs)
    // ──────────────────────────────────────────────────────────

    @GetMapping("/{id}/logs")
    @PreAuthorize("hasAuthority('warehouse_master:view') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Page<com.duylongtech.backend.entity.AuditLog>>> getWarehouseLogs(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(auditLogService.getLogsForEntity("Warehouse", id, page, size)));
    }

    @GetMapping("/{id}/inventory")
    @PreAuthorize("hasAuthority('warehouse_master:view') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<List<WarehouseStockAiRow>>> getWarehouseInventory(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(warehouseService.getWarehouseInventory(id)));
    }

    @GetMapping("/{id}/variants/{variantId}/serials")
    @PreAuthorize("hasAuthority('warehouse_master:view') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<List<String>>> getAvailableSerials(@PathVariable Long id, @PathVariable Long variantId) {
        return ResponseEntity.ok(ApiResponse.success(warehouseService.getAvailableSerials(id, variantId)));
    }

    // ──────────────────────────────────────────────────────────
    // US1: POST - Tạo mới kho
    // ──────────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAuthority('warehouse_master:add') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<WarehouseResponse>> createWarehouse(
            @Valid @RequestBody WarehouseRequest request,
            jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUsername();
        Long userId = getCurrentUserId();
        try {
            WarehouseResponse created = warehouseService.createWarehouse(request, userId);
            String detailJson = auditLogService.buildChangeDetail(null, warehouseAuditSnapshot(created), "Created warehouse");
            auditLogService.logEvent(
                    actor, "CREATE", "Warehouse", created.getId(),
                    "SUCCESS", "Tạo mới kho: " + created.getName(), ip, detailJson);
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
        } catch (Exception e) {
            auditLogService.logEvent(
                    actor, "CREATE", "Warehouse", null,
                    "FAILED", "Tạo mới kho: " + request.getName() + " thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    // ──────────────────────────────────────────────────────────
    // US3: PUT - Cập nhật thông tin kho
    // ──────────────────────────────────────────────────────────

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('warehouse_master:edit') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<WarehouseResponse>> updateWarehouse(
            @PathVariable Long id,
            @Valid @RequestBody WarehouseRequest request,
            jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUsername();
        Long userId = getCurrentUserId();
        try {
            WarehouseDetailResponse before = warehouseService.getWarehouseDetail(id);
            WarehouseResponse updated = warehouseService.updateWarehouse(id, request, userId);
            String detailJson = auditLogService.buildChangeDetail(
                    warehouseAuditSnapshot(before),
                    warehouseAuditSnapshot(updated),
                    "Updated warehouse"
            );
            auditLogService.logEvent(
                    actor, "UPDATE", "Warehouse", id,
                    "SUCCESS", "Cập nhật kho: " + updated.getName(), ip, detailJson);
            return ResponseEntity.ok(ApiResponse.success(updated));
        } catch (Exception e) {
            auditLogService.logEvent(
                    actor, "UPDATE", "Warehouse", id,
                    "FAILED", "Cập nhật kho ID " + id + " thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    // ──────────────────────────────────────────────────────────
    // US4: DELETE - Soft Delete kho
    // ──────────────────────────────────────────────────────────

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('warehouse_master:delete') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteWarehouse(
            @PathVariable Long id,
            jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUsername();
        try {
            WarehouseDetailResponse before = warehouseService.getWarehouseDetail(id);
            boolean isHardDeleted = warehouseService.deleteWarehouse(id);
            if (!isHardDeleted) {
                WarehouseDetailResponse after = warehouseService.getWarehouseDetail(id);
                String detailJson = auditLogService.buildChangeDetail(
                        warehouseAuditSnapshot(before),
                        warehouseAuditSnapshot(after),
                        "Warehouse has inventory, changed status to INACTIVE"
                );
                // Soft deleted - return 409 Conflict as per spec
                auditLogService.logEvent(
                        actor, "DELETE", "Warehouse", id,
                        "SUCCESS", "Kho đã phát sinh giao dịch, tự động chuyển trạng thái về INACTIVE", ip, detailJson);
                return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(
                        SystemMessage.WH_HAS_TRANSACTION.getCode(), SystemMessage.WH_HAS_TRANSACTION.getMessage()));
            }

            String detailJson = auditLogService.buildChangeDetail(
                    warehouseAuditSnapshot(before),
                    null,
                    "Deleted warehouse"
            );
            auditLogService.logEvent(
                    actor, "DELETE", "Warehouse", id,
                    "SUCCESS", "Xóa vật lý kho ID: " + id, ip, detailJson);
            return ResponseEntity.ok(ApiResponse.success(null));
        } catch (Exception e) {
            auditLogService.logEvent(
                    actor, "DELETE", "Warehouse", id,
                    "FAILED", "Xóa kho ID " + id + " thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }
}
