package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.AssemblyBomRequest;
import com.duylongtech.backend.dto.request.AssemblyOrderRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.AssemblyBomResponse;
import com.duylongtech.backend.dto.response.AssemblyOrderResponse;
import com.duylongtech.backend.service.AssemblyOrderService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AssemblyOrderController {
    private final AssemblyOrderService assemblyOrderService;

    @GetMapping("/assembly-boms")
    @Operation(summary = "View assembly BOMs")
    @PreAuthorize("hasAuthority('assembly:view')")
    public ApiResponse<List<AssemblyBomResponse>> getBoms(@RequestParam(required = false) String status) {
        return ApiResponse.success(assemblyOrderService.getBoms(status));
    }

    @PostMapping("/assembly-boms")
    @Operation(summary = "Create assembly BOM")
    @PreAuthorize("hasAuthority('assembly:add')")
    public ApiResponse<AssemblyBomResponse> createBom(@RequestBody AssemblyBomRequest request) {
        return ApiResponse.success(assemblyOrderService.createBom(request));
    }

    @PutMapping("/assembly-boms/{id}")
    @Operation(summary = "Update assembly BOM")
    @PreAuthorize("hasAuthority('assembly:edit')")
    public ApiResponse<AssemblyBomResponse> updateBom(@PathVariable Long id, @RequestBody AssemblyBomRequest request) {
        return ApiResponse.success(assemblyOrderService.updateBom(id, request));
    }

    @GetMapping("/assembly-orders")
    @Operation(summary = "View assembly/disassembly history")
    @PreAuthorize("hasAuthority('assembly:view')")
    public ApiResponse<List<AssemblyOrderResponse>> getAssemblyOrders(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String orderType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        return ApiResponse.success(assemblyOrderService.getAssemblyOrders(keyword, orderType, status, warehouseId, fromDate, toDate));
    }

    @GetMapping("/assembly-orders/{id}")
    @Operation(summary = "View assembly/disassembly detail")
    @PreAuthorize("hasAuthority('assembly:view')")
    public ApiResponse<AssemblyOrderResponse> getAssemblyOrderById(@PathVariable Long id) {
        return ApiResponse.success(assemblyOrderService.getAssemblyOrderById(id));
    }

    @PostMapping("/assembly-orders")
    @Operation(summary = "Create assembly order")
    @PreAuthorize("hasAuthority('assembly:add')")
    public ApiResponse<AssemblyOrderResponse> createAssemblyOrder(@RequestBody AssemblyOrderRequest request) {
        return ApiResponse.success(assemblyOrderService.createAssemblyOrder(request));
    }

    @PostMapping("/disassembly-orders")
    @Operation(summary = "Create disassembly order")
    @PreAuthorize("hasAuthority('assembly:add')")
    public ApiResponse<AssemblyOrderResponse> createDisassemblyOrder(@RequestBody AssemblyOrderRequest request) {
        return ApiResponse.success(assemblyOrderService.createDisassemblyOrder(request));
    }

    @PutMapping("/assembly-orders/{id}")
    @Operation(summary = "Update assembly/disassembly order")
    @PreAuthorize("hasAuthority('assembly:edit')")
    public ApiResponse<AssemblyOrderResponse> updateAssemblyOrder(@PathVariable Long id, @RequestBody AssemblyOrderRequest request) {
        return ApiResponse.success(assemblyOrderService.updateAssemblyOrder(id, request));
    }
}
