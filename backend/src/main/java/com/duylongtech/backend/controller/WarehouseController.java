package com.duylongtech.backend.controller;

import com.duylongtech.backend.annotation.Auditable;
import com.duylongtech.backend.enums.AuditAction;
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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

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

    private Long getCurrentUserId() {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .or(() -> userRepository.findByEmail(username))
                .map(User::getId)
                .orElse(null);
    }

    @GetMapping("/my-warehouses")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<WarehouseResponse>>> getMyWarehouses(
            @AuthenticationPrincipal UserDetailsImpl userPrincipal) {
        Long userId = userPrincipal != null ? userPrincipal.getId() : getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.success(warehouseService.getMyWarehouses(userId)));
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

    @GetMapping("/{id}/variants/{variantId}/serial-tree")
    @PreAuthorize("hasAuthority('warehouse_master:view') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<List<com.duylongtech.backend.dto.response.SerialTreeResponse>>> getSerialTree(@PathVariable Long id, @PathVariable Long variantId) {
        return ResponseEntity.ok(ApiResponse.success(warehouseService.getSerialTree(id, variantId)));
    }

    @GetMapping("/serials/check")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Boolean>> checkSerialExists(
            @RequestParam(required = false) Long variantId,
            @RequestParam String serialNumber) {
        return ResponseEntity.ok(ApiResponse.success(warehouseService.checkSerialExists(variantId, serialNumber)));
    }

    // ──────────────────────────────────────────────────────────
    // US1: POST - Tạo mới kho
    // ──────────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAuthority('warehouse_master:add') or hasRole('MANAGER')")
    @Auditable(action = AuditAction.CREATE, entityName = "Warehouse", actionDescription = "Tạo mới kho")
    public ResponseEntity<ApiResponse<WarehouseResponse>> createWarehouse(
            @Valid @RequestBody WarehouseRequest request) {
        Long userId = getCurrentUserId();
        WarehouseResponse created = warehouseService.createWarehouse(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    // ──────────────────────────────────────────────────────────
    // US3: PUT - Cập nhật thông tin kho
    // ──────────────────────────────────────────────────────────

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('warehouse_master:edit') or hasRole('MANAGER')")
    @Auditable(action = AuditAction.UPDATE, entityName = "Warehouse", actionDescription = "Cập nhật thông tin kho")
    public ResponseEntity<ApiResponse<WarehouseResponse>> updateWarehouse(
            @PathVariable Long id,
            @Valid @RequestBody WarehouseRequest request) {
        Long userId = getCurrentUserId();
        WarehouseResponse updated = warehouseService.updateWarehouse(id, request, userId);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    // ──────────────────────────────────────────────────────────
    // US4: DELETE - Soft Delete kho
    // ──────────────────────────────────────────────────────────

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('warehouse_master:delete') or hasRole('MANAGER')")
    @Auditable(action = AuditAction.DELETE, entityName = "Warehouse", actionDescription = "Xóa kho")
    public ResponseEntity<ApiResponse<Void>> deleteWarehouse(@PathVariable Long id) {
        boolean isHardDeleted = warehouseService.deleteWarehouse(id);
        if (!isHardDeleted) {
            // Soft deleted - return 409 Conflict as per spec
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(
                    SystemMessage.WH_HAS_TRANSACTION.getCode(), SystemMessage.WH_HAS_TRANSACTION.getMessage()));
        }
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
