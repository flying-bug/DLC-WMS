package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.WarrantyRequest;
import com.duylongtech.backend.dto.request.WarrantyStatusRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.WarrantyResponse;
import com.duylongtech.backend.service.WarrantyLifecycleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/warranties")
@RequiredArgsConstructor
@Tag(name = "Warranty Lifecycle", description = "API tao, cap nhat va dong ho so bao hanh")
public class WarrantyLifecycleController {

    private final WarrantyLifecycleService warrantyLifecycleService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create warranty claim")
    @PreAuthorize("hasAuthority('warranty:add') or hasRole('MANAGER') or hasRole('SUPER_ADMIN')")
    public ApiResponse<WarrantyResponse> createWarranty(@RequestBody WarrantyRequest request) {
        return ApiResponse.success(warrantyLifecycleService.createWarranty(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update warranty claim")
    @PreAuthorize("hasAuthority('warranty:edit') or hasRole('MANAGER') or hasRole('SUPER_ADMIN')")
    public ApiResponse<WarrantyResponse> updateWarranty(@PathVariable Long id,
                                                        @RequestBody WarrantyRequest request) {
        return ApiResponse.success(warrantyLifecycleService.updateWarranty(id, request));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update warranty status or close warranty")
    @PreAuthorize("hasAuthority('warranty:edit') or hasRole('MANAGER') or hasRole('SUPER_ADMIN')")
    public ApiResponse<WarrantyResponse> updateWarrantyStatus(@PathVariable Long id,
                                                              @RequestBody WarrantyStatusRequest request) {
        return ApiResponse.success(warrantyLifecycleService.updateWarrantyStatus(id, request));
    }
}
