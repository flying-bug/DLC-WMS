package com.duylongtech.backend.feature.warehouse;

import com.duylongtech.backend.feature.auth.AssignRolesRequest;
import com.duylongtech.backend.common.ApiResponse;
import com.duylongtech.backend.feature.warehouse.WarehouseStaffResponse;
import com.duylongtech.backend.feature.warehouse.WarehouseStaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/warehouses/{warehouseId}/staff")
@RequiredArgsConstructor
public class WarehouseStaffController {

    private final WarehouseStaffService warehouseStaffService;

    @GetMapping
    @PreAuthorize("hasAuthority('warehouse_master:view')")
    public ApiResponse<Page<WarehouseStaffResponse>> getStaffList(
            @PathVariable Long warehouseId,
            @RequestParam(required = false) Long roleId,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<WarehouseStaffResponse> result = warehouseStaffService.getStaffList(warehouseId, roleId, isActive, search, pageable);
        return ApiResponse.success(result);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('warehouse_master:edit')")
    public ApiResponse<Void> assignRoles(
            @PathVariable Long warehouseId,
            @RequestBody @Valid AssignRolesRequest request
    ) {
        warehouseStaffService.assignRoles(warehouseId, request);
        return ApiResponse.success(null);
    }

    @DeleteMapping("/{userId}")
    @PreAuthorize("hasAuthority('warehouse_master:edit')")
    public ApiResponse<Void> revokeAccess(
            @PathVariable Long warehouseId,
            @PathVariable Long userId
    ) {
        warehouseStaffService.revokeAccess(warehouseId, userId);
        return ApiResponse.success(null);
    }
}
