package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.AssemblyBomRequest;
import com.duylongtech.backend.dto.request.AssemblyOrderRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.AssemblyBomResponse;
import com.duylongtech.backend.dto.response.AssemblyOrderResponse;
import com.duylongtech.backend.service.AssemblyOrderService;
import com.duylongtech.backend.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AssemblyOrderController {
    private final AssemblyOrderService assemblyOrderService;
    private final AuditLogService auditLogService;

    private String getClientIp(HttpServletRequest request) {
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
        if (org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication() == null) return "System";
        return org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
    }

    @GetMapping("/assembly-boms")
    @Operation(summary = "View assembly BOMs")
    @PreAuthorize("hasAuthority('assembly:view')")
    public ApiResponse<List<AssemblyBomResponse>> getBoms(@RequestParam(required = false) String status) {
        return ApiResponse.success(assemblyOrderService.getBoms(status));
    }

    @GetMapping("/assembly-boms/{id}")
    @Operation(summary = "View assembly BOM detail")
    @PreAuthorize("hasAuthority('assembly:view')")
    public ApiResponse<AssemblyBomResponse> getBomById(@PathVariable Long id) {
        return ApiResponse.success(assemblyOrderService.getBomById(id));
    }

    @PostMapping("/assembly-boms")
    @Operation(summary = "Create assembly BOM")
    @PreAuthorize("hasAuthority('assembly:add')")
    public ApiResponse<AssemblyBomResponse> createBom(@Valid @RequestBody AssemblyBomRequest request, HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            AssemblyBomResponse created = assemblyOrderService.createBom(request);
            auditLogService.logEvent(actor, "CREATE", "AssemblyBom", created.getId(), "SUCCESS", "Tạo BOM: " + created.getBomCode(), ip, null);
            return ApiResponse.success(created);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "CREATE", "AssemblyBom", null, "FAILED", "Tạo BOM thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    @PutMapping("/assembly-boms/{id}")
    @Operation(summary = "Update assembly BOM")
    @PreAuthorize("hasAuthority('assembly:edit')")
    public ApiResponse<AssemblyBomResponse> updateBom(@PathVariable Long id, @Valid @RequestBody AssemblyBomRequest request, HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            AssemblyBomResponse updated = assemblyOrderService.updateBom(id, request);
            auditLogService.logEvent(actor, "UPDATE", "AssemblyBom", id, "SUCCESS", "Cập nhật BOM: " + updated.getBomCode(), ip, null);
            return ApiResponse.success(updated);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "UPDATE", "AssemblyBom", id, "FAILED", "Cập nhật BOM thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
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
    public ApiResponse<AssemblyOrderResponse> createAssemblyOrder(@Valid @RequestBody AssemblyOrderRequest request, HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            AssemblyOrderResponse created = assemblyOrderService.createAssemblyOrder(request);
            auditLogService.logEvent(actor, "CREATE", "AssemblyOrder", created.getId(), "SUCCESS", "Tạo Lệnh Lắp ráp: " + created.getOrderCode(), ip, null);
            return ApiResponse.success(created);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "CREATE", "AssemblyOrder", null, "FAILED", "Tạo Lệnh Lắp ráp thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    @PostMapping("/disassembly-orders")
    @Operation(summary = "Create disassembly order")
    @PreAuthorize("hasAuthority('assembly:add')")
    public ApiResponse<AssemblyOrderResponse> createDisassemblyOrder(@Valid @RequestBody AssemblyOrderRequest request, HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            AssemblyOrderResponse created = assemblyOrderService.createDisassemblyOrder(request);
            auditLogService.logEvent(actor, "CREATE", "DisassemblyOrder", created.getId(), "SUCCESS", "Tạo Lệnh Tháo dỡ: " + created.getOrderCode(), ip, null);
            return ApiResponse.success(created);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "CREATE", "DisassemblyOrder", null, "FAILED", "Tạo Lệnh Tháo dỡ thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    @PutMapping("/assembly-orders/{id}")
    @Operation(summary = "Update assembly/disassembly order")
    @PreAuthorize("hasAuthority('assembly:edit')")
    public ApiResponse<AssemblyOrderResponse> updateAssemblyOrder(@PathVariable Long id, @Valid @RequestBody AssemblyOrderRequest request, HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            AssemblyOrderResponse updated = assemblyOrderService.updateAssemblyOrder(id, request);
            auditLogService.logEvent(actor, "UPDATE", "AssemblyOrder", id, "SUCCESS", "Cập nhật Lệnh: " + updated.getOrderCode(), ip, null);
            return ApiResponse.success(updated);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "UPDATE", "AssemblyOrder", id, "FAILED", "Cập nhật Lệnh thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    @PutMapping("/assembly-orders/{id}/status")
    @Operation(summary = "Update assembly order status")
    @PreAuthorize("hasAuthority('assembly:edit')")
    public ApiResponse<AssemblyOrderResponse> updateOrderStatus(
            @PathVariable Long id,
            @RequestParam String status,
            HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            AssemblyOrderResponse updated = assemblyOrderService.updateOrderStatus(id, status);
            auditLogService.logEvent(actor, "UPDATE", "AssemblyOrderStatus", id, "SUCCESS", "Cập nhật trạng thái Lệnh thành " + status, ip, null);
            return ApiResponse.success(updated);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "UPDATE", "AssemblyOrderStatus", id, "FAILED", "Cập nhật trạng thái Lệnh thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    @PostMapping("/assembly-orders/{id}/inventory-documents")
    @Operation(summary = "Generate inventory document for assembly order")
    @PreAuthorize("hasAuthority('assembly:edit')")
    public ApiResponse<Void> generateInventoryDocument(
            @PathVariable Long id,
            @Valid @RequestBody com.duylongtech.backend.dto.request.GenerateInventoryDocumentRequest request,
            HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            assemblyOrderService.generateInventoryDocument(id, request, actor);
            auditLogService.logEvent(actor, "CREATE", "InventoryDocument", null, "SUCCESS", "Tạo phiếu kho cho Lệnh Lắp ráp ID: " + id, ip, null);
            return ApiResponse.success(null);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "CREATE", "InventoryDocument", null, "FAILED", "Tạo phiếu kho thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }
}
