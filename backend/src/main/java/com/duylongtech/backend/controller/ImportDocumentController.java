package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.InventoryDocumentRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.InventoryDocumentResponse;
import com.duylongtech.backend.service.AuditLogService;
import com.duylongtech.backend.service.InventoryDocumentService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/imports")
@RequiredArgsConstructor
public class ImportDocumentController {

    private final InventoryDocumentService inventoryDocumentService;
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

    @GetMapping("/history")
    @Operation(summary = "View import slip history")
    @PreAuthorize("hasAuthority('import:view') or hasAuthority('export:view')")
    public ApiResponse<List<InventoryDocumentResponse>> getImportHistory(
            @RequestParam(required = false) String docCode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long warehouseId
    ) {
        return ApiResponse.success(inventoryDocumentService.getImportHistory(docCode, fromDate, toDate, status, warehouseId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "View import slip detail")
    @PreAuthorize("hasAuthority('import:view') or hasAuthority('export:view')")
    public ApiResponse<InventoryDocumentResponse> getImportDetail(@PathVariable Long id) {
        return ApiResponse.success(inventoryDocumentService.getImportDetail(id));
    }

    @PostMapping("/create")
    @Operation(summary = "Create import slip")
    @PreAuthorize("hasAuthority('import:add') or hasAuthority('export:add')")
    public ApiResponse<InventoryDocumentResponse> createImport(
            @RequestBody InventoryDocumentRequest req,
            jakarta.servlet.http.HttpServletRequest servletRequest
    ) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            InventoryDocumentResponse created = inventoryDocumentService.createImport(req);
            auditLogService.logEvent(actor, "CREATE", "ImportSlip", created.getId(), "SUCCESS",
                    "Tao phieu nhap kho " + created.getDocCode(), ip, null);
            return ApiResponse.success(created);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "CREATE", "ImportSlip", null, "FAILED",
                    "Tao phieu nhap kho that bai: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update import slip")
    @PreAuthorize("hasAuthority('import:edit') or hasAuthority('export:edit')")
    public ApiResponse<InventoryDocumentResponse> updateImport(
            @PathVariable Long id,
            @RequestBody InventoryDocumentRequest req,
            jakarta.servlet.http.HttpServletRequest servletRequest
    ) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            InventoryDocumentResponse updated = inventoryDocumentService.updateImport(id, req);
            auditLogService.logEvent(actor, "UPDATE", "ImportSlip", id, "SUCCESS",
                    "Cap nhat phieu nhap kho " + updated.getDocCode(), ip, null);
            return ApiResponse.success(updated);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "UPDATE", "ImportSlip", id, "FAILED",
                    "Cap nhat phieu nhap kho ID " + id + " that bai: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    @PostMapping("/{id}/post")
    @Operation(summary = "Post import slip")
    @PreAuthorize("hasAuthority('import:edit') or hasAuthority('export:edit')")
    public ApiResponse<InventoryDocumentResponse> postImport(@PathVariable Long id, jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            InventoryDocumentResponse posted = inventoryDocumentService.postImport(id);
            auditLogService.logEvent(actor, "POST", "ImportSlip", id, "SUCCESS",
                    "Ghi so phieu nhap kho " + posted.getDocCode(), ip, null);
            return ApiResponse.success(posted);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "POST", "ImportSlip", id, "FAILED",
                    "Ghi so phieu nhap kho ID " + id + " that bai: " + e.getMessage(), ip, null);
            throw e;
        }
    }
}
