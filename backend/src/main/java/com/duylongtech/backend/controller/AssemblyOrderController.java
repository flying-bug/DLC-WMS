package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.AssemblyBomRequest;
import com.duylongtech.backend.dto.request.AssemblyOrderRequest;
import com.duylongtech.backend.dto.request.AssemblyOrderSerialRequest;
import com.duylongtech.backend.dto.request.WorkflowActionRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.AssemblyBomResponse;
import com.duylongtech.backend.dto.response.AssemblyOrderResponse;
import com.duylongtech.backend.dto.response.AssemblyOrderSerialResponse;
import com.duylongtech.backend.dto.response.InventoryDocumentResponse;
import com.duylongtech.backend.dto.response.SerialTreeResponse;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.security.UserDetailsImpl;
import com.duylongtech.backend.service.AssemblyOrderService;
import com.duylongtech.backend.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
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

    private Long getCurrentUserId() {
        var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return userDetails.getId();
        }
        throw new BusinessException("Không xác định được người dùng đang đăng nhập");
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
    public ApiResponse<AssemblyBomResponse> createBom(@Valid @RequestBody AssemblyBomRequest request, HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            AssemblyBomResponse created = assemblyOrderService.createBom(request);
            auditLogService.logEvent(actor, "CREATE", "AssemblyBom", created.getId(), "SUCCESS", "Tạo cấu hình: " + created.getBomCode(), ip, null);
            return ApiResponse.success(created);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "CREATE", "AssemblyBom", null, "FAILED", "Tạo cấu hình thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    @PutMapping("/assembly-boms/{id}")
    @Operation(summary = "Update assembly BOM")
    @PreAuthorize("hasAuthority('assembly_config:edit')")
    public ApiResponse<AssemblyBomResponse> updateBom(@PathVariable Long id, @Valid @RequestBody AssemblyBomRequest request, HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            AssemblyBomResponse updated = assemblyOrderService.updateBom(id, request);
            auditLogService.logEvent(actor, "UPDATE", "AssemblyBom", id, "SUCCESS", "Cập nhật cấu hình: " + updated.getBomCode(), ip, null);
            return ApiResponse.success(updated);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "UPDATE", "AssemblyBom", id, "FAILED", "Cập nhật cấu hình thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    @PostMapping("/assembly-boms/{id}/submit")
    @PreAuthorize("hasAuthority('assembly_config:edit')")
    @Operation(summary = "Submit or resubmit an assembly BOM")
    public ApiResponse<AssemblyBomResponse> submitBom(@PathVariable Long id) {
        AssemblyBomResponse result = assemblyOrderService.submitBom(id, getCurrentUserId());
        auditLogService.logEvent(getCurrentUser(), "SUBMIT", "AssemblyBom", id, "SUCCESS", "Gửi duyệt BOM", null, null);
        return ApiResponse.success(result);
    }

    @PostMapping("/assembly-boms/{id}/approve")
    @PreAuthorize("hasAuthority('assembly:approve')")
    @Operation(summary = "Approve an assembly BOM")
    public ApiResponse<AssemblyBomResponse> approveBom(@PathVariable Long id) {
        AssemblyBomResponse result = assemblyOrderService.approveBom(id, getCurrentUserId());
        auditLogService.logEvent(getCurrentUser(), "APPROVE", "AssemblyBom", id, "SUCCESS", "Duyệt BOM", null, null);
        return ApiResponse.success(result);
    }

    @PostMapping("/assembly-boms/{id}/reject")
    @PreAuthorize("hasAuthority('assembly:approve')")
    @Operation(summary = "Reject an assembly BOM")
    public ApiResponse<AssemblyBomResponse> rejectBom(@PathVariable Long id, @RequestBody WorkflowActionRequest request) {
        AssemblyBomResponse result = assemblyOrderService.rejectBom(id, getCurrentUserId(), request.getReason());
        auditLogService.logEvent(getCurrentUser(), "REJECT", "AssemblyBom", id, "SUCCESS", "Từ chối BOM: " + request.getReason(), null, null);
        return ApiResponse.success(result);
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
            request.setCreatedBy(getCurrentUserId());
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
            request.setCreatedBy(getCurrentUserId());
            AssemblyOrderResponse created = assemblyOrderService.createDisassemblyOrder(request);
            auditLogService.logEvent(actor, "CREATE", "DisassemblyOrder", created.getId(), "SUCCESS", "Tạo Lệnh Tháo dỡ: " + created.getOrderCode(), ip, null);
            return ApiResponse.success(created);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "CREATE", "DisassemblyOrder", null, "FAILED", "Tạo Lệnh Tháo dỡ thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    @PostMapping("/assembly-orders/{id}/submit")
    @PreAuthorize("hasAuthority('assembly:submit')")
    @Operation(summary = "Submit or resubmit an assembly order")
    public ApiResponse<AssemblyOrderResponse> submitOrder(@PathVariable Long id) {
        AssemblyOrderResponse result = assemblyOrderService.submitOrder(id, getCurrentUserId());
        auditLogService.logEvent(getCurrentUser(), "SUBMIT", "AssemblyOrder", id, "SUCCESS", "Gửi duyệt lệnh", null, null);
        return ApiResponse.success(result);
    }

    @PostMapping("/assembly-orders/{id}/approve")
    @PreAuthorize("hasAuthority('assembly:approve')")
    @Operation(summary = "Approve an assembly order and create its inventory document pair")
    public ApiResponse<AssemblyOrderResponse> approveOrder(@PathVariable Long id) {
        AssemblyOrderResponse result = assemblyOrderService.approveOrder(id, getCurrentUserId());
        auditLogService.logEvent(getCurrentUser(), "APPROVE", "AssemblyOrder", id, "SUCCESS", "Duyệt lệnh và tạo cặp phiếu kho", null, null);
        return ApiResponse.success(result);
    }

    @PostMapping("/assembly-orders/{id}/reject")
    @PreAuthorize("hasAuthority('assembly:approve')")
    @Operation(summary = "Reject an assembly order")
    public ApiResponse<AssemblyOrderResponse> rejectOrder(@PathVariable Long id, @RequestBody WorkflowActionRequest request) {
        AssemblyOrderResponse result = assemblyOrderService.rejectOrder(id, getCurrentUserId(), request.getReason());
        auditLogService.logEvent(getCurrentUser(), "REJECT", "AssemblyOrder", id, "SUCCESS", "Từ chối lệnh: " + request.getReason(), null, null);
        return ApiResponse.success(result);
    }

    @PostMapping("/assembly-orders/{id}/cancel-request")
    @PreAuthorize("hasAuthority('assembly:submit')")
    @Operation(summary = "Request cancellation of an assembly order")
    public ApiResponse<AssemblyOrderResponse> requestCancel(@PathVariable Long id, @RequestBody WorkflowActionRequest request) {
        return ApiResponse.success(assemblyOrderService.requestCancel(id, getCurrentUserId(), request.getReason()));
    }

    @PostMapping("/assembly-orders/{id}/cancel-confirm")
    @PreAuthorize("hasAuthority('assembly:approve')")
    @Operation(summary = "Confirm cancellation of an approved assembly order")
    public ApiResponse<AssemblyOrderResponse> confirmCancel(@PathVariable Long id) {
        return ApiResponse.success(assemblyOrderService.confirmCancel(id, getCurrentUserId()));
    }

    @GetMapping("/assembly-orders/{id}/inventory-documents")
    @PreAuthorize("hasAuthority('assembly:view')")
    @Operation(summary = "Get the export/import document pair of an assembly order")
    public ApiResponse<List<InventoryDocumentResponse>> getOrderDocuments(@PathVariable Long id) {
        return ApiResponse.success(assemblyOrderService.getOrderDocuments(id));
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
    @PreAuthorize("denyAll()")
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

    @PatchMapping("/assembly-orders/{id}/note")
    @Operation(summary = "Update assembly order note")
    @PreAuthorize("hasAuthority('assembly:edit')")
    public ApiResponse<AssemblyOrderResponse> updateOrderNote(
            @PathVariable Long id,
            @RequestBody AssemblyOrderRequest request,
            HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            AssemblyOrderResponse updated = assemblyOrderService.updateNote(id, request);
            auditLogService.logEvent(actor, "UPDATE", "AssemblyOrderNote", id, "SUCCESS", "Cập nhật ghi chú Lệnh: " + updated.getOrderCode(), ip, null);
            return ApiResponse.success(updated);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "UPDATE", "AssemblyOrderNote", id, "FAILED", "Cập nhật ghi chú thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    @PostMapping("/assembly-orders/{id}/inventory-documents")
    @Operation(summary = "Generate inventory document for assembly order")
    @PreAuthorize("denyAll()")
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

    @GetMapping("/assembly-orders/{id}/serials")
    @Operation(summary = "Get assembly order serials")
    @PreAuthorize("hasAuthority('assembly:view')")
    public ApiResponse<List<AssemblyOrderSerialResponse>> getSerials(@PathVariable Long id) {
        return ApiResponse.success(assemblyOrderService.getSerials(id));
    }

    @PostMapping("/assembly-orders/{id}/serials")
    @Operation(summary = "Save assembly order serials")
    @PreAuthorize("denyAll()")
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
    @PreAuthorize("denyAll()")
    public ApiResponse<Void> executeAssemblyOrder(
            @PathVariable Long id,
            @RequestBody @Valid com.duylongtech.backend.dto.request.AssemblyExecutionRequest request,
            HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        Long userId = 1L; // Fallback ID if cannot determine from context, in a real app extract from Principal
        try {
            // Retrieve userId from security context if available
            if (org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication() != null) {
                Object principal = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getPrincipal();
                if (principal instanceof com.duylongtech.backend.security.UserDetailsImpl) {
                    userId = ((com.duylongtech.backend.security.UserDetailsImpl) principal).getId();
                }
            }
            
            assemblyOrderService.executeAssemblyOrder(id, request, userId);
            auditLogService.logEvent(actor, "EXECUTE", "AssemblyOrder", id, "SUCCESS", "Thực thi lắp ráp qua quét mã vạch thành công", ip, null);
            return ApiResponse.success(null);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "EXECUTE", "AssemblyOrder", id, "FAILED", "Thực thi lắp ráp thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }
}
