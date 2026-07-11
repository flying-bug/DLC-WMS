package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.AssignRolesRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.WarehouseStaffResponse;
import com.duylongtech.backend.service.WarehouseStaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/warehouses/{warehouseId}/staff")
@RequiredArgsConstructor
public class WarehouseStaffController {

    private final WarehouseStaffService warehouseStaffService;

    @GetMapping
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
    public ApiResponse<Void> assignRoles(
            @PathVariable Long warehouseId,
            @RequestBody @Valid AssignRolesRequest request
    ) {
        warehouseStaffService.assignRoles(warehouseId, request);
        return ApiResponse.success(null);
    }

    @DeleteMapping("/{userId}")
    public ApiResponse<Void> revokeAccess(
            @PathVariable Long warehouseId,
            @PathVariable Long userId
    ) {
        warehouseStaffService.revokeAccess(warehouseId, userId);
        return ApiResponse.success(null);
    }
}
