package com.duylongtech.backend.controller;

import com.duylongtech.backend.annotation.Auditable;
import com.duylongtech.backend.enums.AuditAction;
import com.duylongtech.backend.dto.request.AssemblyBomRequest;
import com.duylongtech.backend.dto.request.AssemblyOrderRequest;
import com.duylongtech.backend.dto.request.AssemblyOrderSerialRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.AssemblyBomResponse;
import com.duylongtech.backend.dto.response.AssemblyOrderResponse;
import com.duylongtech.backend.dto.response.AssemblyOrderSerialResponse;
import com.duylongtech.backend.dto.response.SerialTreeResponse;
import com.duylongtech.backend.service.AssemblyOrderService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AssemblyOrderController {
    private final AssemblyOrderService assemblyOrderService;

    private String getCurrentUser() {
        if (org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication() == null) return "System";
        return org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
    }

    @GetMapping("/assembly-boms")
    @Operation(summary = "View assembly BOMs")
    @PreAuthorize("hasAuthority('assembly_config:view')")
    public ApiResponse<List<AssemblyBomResponse>> getBoms(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long productId
    ) {
        return ApiResponse.success(assemblyOrderService.getBoms(status, productId));
    }

    @GetMapping("/assembly-boms/{id}")
    @Operation(summary = "View assembly BOM detail")
    @PreAuthorize("hasAuthority('assembly_config:view')")
    public ApiResponse<AssemblyBomResponse> getBomById(@PathVariable Long id) {
        return ApiResponse.success(assemblyOrderService.getBomById(id));
    }

    @PostMapping("/assembly-boms")
    @Operation(summary = "Create assembly BOM")
    @PreAuthorize("hasAuthority('assembly_config:add')")
    @Auditable(action = AuditAction.CREATE, entityName = "AssemblyBom", actionDescription = "Tạo cấu hình BOM")
    public ApiResponse<AssemblyBomResponse> createBom(@Valid @RequestBody AssemblyBomRequest request) {
        return ApiResponse.success(assemblyOrderService.createBom(request));
    }

    @PutMapping("/assembly-boms/{id}")
    @Operation(summary = "Update assembly BOM")
    @PreAuthorize("hasAuthority('assembly_config:edit')")
    @Auditable(action = AuditAction.UPDATE, entityName = "AssemblyBom", actionDescription = "Cập nhật cấu hình BOM")
    public ApiResponse<AssemblyBomResponse> updateBom(@PathVariable Long id, @Valid @RequestBody AssemblyBomRequest request) {
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
    @Auditable(action = AuditAction.CREATE, entityName = "AssemblyOrder", actionDescription = "Tạo lệnh lắp ráp")
    public ApiResponse<AssemblyOrderResponse> createAssemblyOrder(@Valid @RequestBody AssemblyOrderRequest request) {
        return ApiResponse.success(assemblyOrderService.createAssemblyOrder(request));
    }

    @PostMapping("/disassembly-orders")
    @Operation(summary = "Create disassembly order")
    @PreAuthorize("hasAuthority('assembly:add')")
    @Auditable(action = AuditAction.CREATE, entityName = "DisassemblyOrder", actionDescription = "Tạo lệnh tháo dỡ")
    public ApiResponse<AssemblyOrderResponse> createDisassemblyOrder(@Valid @RequestBody AssemblyOrderRequest request) {
        return ApiResponse.success(assemblyOrderService.createDisassemblyOrder(request));
    }

    @PutMapping("/assembly-orders/{id}")
    @Operation(summary = "Update assembly/disassembly order")
    @PreAuthorize("hasAuthority('assembly:edit')")
    @Auditable(action = AuditAction.UPDATE, entityName = "AssemblyOrder", actionDescription = "Cập nhật lệnh lắp ráp/tháo dỡ")
    public ApiResponse<AssemblyOrderResponse> updateAssemblyOrder(@PathVariable Long id, @Valid @RequestBody AssemblyOrderRequest request) {
        return ApiResponse.success(assemblyOrderService.updateAssemblyOrder(id, request));
    }

    @PutMapping("/assembly-orders/{id}/status")
    @Operation(summary = "Update assembly order status")
    @PreAuthorize("hasAuthority('assembly:edit')")
    @Auditable(action = AuditAction.UPDATE, entityName = "AssemblyOrderStatus", actionDescription = "Cập nhật trạng thái lệnh")
    public ApiResponse<AssemblyOrderResponse> updateOrderStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        return ApiResponse.success(assemblyOrderService.updateOrderStatus(id, status));
    }

    @PatchMapping("/assembly-orders/{id}/note")
    @Operation(summary = "Update assembly order note")
    @PreAuthorize("hasAuthority('assembly:edit')")
    @Auditable(action = AuditAction.UPDATE, entityName = "AssemblyOrderNote", actionDescription = "Cập nhật ghi chú lệnh")
    public ApiResponse<AssemblyOrderResponse> updateOrderNote(
            @PathVariable Long id,
            @RequestBody AssemblyOrderRequest request) {
        return ApiResponse.success(assemblyOrderService.updateNote(id, request));
    }

    @PostMapping("/assembly-orders/{id}/inventory-documents")
    @Operation(summary = "Generate inventory document for assembly order")
    @PreAuthorize("hasAuthority('assembly:edit')")
    @Auditable(action = AuditAction.CREATE, entityName = "InventoryDocument", actionDescription = "Tạo phiếu kho cho lệnh lắp ráp")
    public ApiResponse<Void> generateInventoryDocument(
            @PathVariable Long id,
            @Valid @RequestBody com.duylongtech.backend.dto.request.GenerateInventoryDocumentRequest request) {
        String actor = getCurrentUser();
        assemblyOrderService.generateInventoryDocument(id, request, actor);
        return ApiResponse.success(null);
    }

    @GetMapping("/assembly-orders/{id}/serials")
    @Operation(summary = "Get assembly order serials")
    @PreAuthorize("hasAuthority('assembly:view')")
    public ApiResponse<List<AssemblyOrderSerialResponse>> getSerials(@PathVariable Long id) {
        return ApiResponse.success(assemblyOrderService.getSerials(id));
    }

    @PostMapping("/assembly-orders/{id}/serials")
    @Operation(summary = "Save assembly order serials")
    @PreAuthorize("hasAuthority('assembly:edit')")
    public ApiResponse<Void> saveSerials(
            @PathVariable Long id,
            @RequestBody @Valid List<AssemblyOrderSerialRequest> requests) {
        assemblyOrderService.saveSerials(id, requests);
        return ApiResponse.success(null);
    }

    @GetMapping("/assembly-serial-tree")
    @Operation(summary = "Get component serials by target serial")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<SerialTreeResponse> getSerialTreeByTarget(
            @RequestParam(required = false) Long serialNumberId,
            @RequestParam(required = false) Long targetVariantId,
            @RequestParam(required = false) String targetSerial) {
        return ApiResponse.success(assemblyOrderService.getSerialTreeByTarget(serialNumberId, targetVariantId, targetSerial));
    }

    @PostMapping("/assembly-orders/{id}/execute")
    @Operation(summary = "Execute assembly order (scan and go)")
    @PreAuthorize("hasAuthority('assembly:edit')")
    @Auditable(action = AuditAction.EXECUTE, entityName = "AssemblyOrder", actionDescription = "Thực thi lắp ráp qua quét mã vạch")
    public ApiResponse<Void> executeAssemblyOrder(
            @PathVariable Long id,
            @RequestBody @Valid com.duylongtech.backend.dto.request.AssemblyExecutionRequest request) {
        Long userId = 1L; // Fallback ID if cannot determine from context, in a real app extract from Principal
        if (org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication() != null) {
            Object principal = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            if (principal instanceof com.duylongtech.backend.security.UserDetailsImpl) {
                userId = ((com.duylongtech.backend.security.UserDetailsImpl) principal).getId();
            }
        }
        assemblyOrderService.executeAssemblyOrder(id, request, userId);
        return ApiResponse.success(null);
    }
}
