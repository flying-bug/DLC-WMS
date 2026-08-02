package com.duylongtech.backend.controller;

import jakarta.validation.Valid;
import com.duylongtech.backend.dto.request.InventoryDocumentRequest;
import com.duylongtech.backend.dto.request.ScanResolveRequest;
import com.duylongtech.backend.dto.response.InventoryDocumentResponse;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.ScanResolveResponse;
import com.duylongtech.backend.service.InventoryDocumentService;
import com.duylongtech.backend.service.AuditLogService;
import com.duylongtech.backend.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/exports")
@RequiredArgsConstructor
public class InventoryDocumentController {

    private final InventoryDocumentService inventoryDocumentService;
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;

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

    @GetMapping("/next-code")
    @Operation(summary = "Get next export slip code")
    @PreAuthorize("hasAuthority('export:view') or hasAuthority('export:add')")
    public ApiResponse<String> getNextExportCode() {
        return ApiResponse.success(inventoryDocumentService.generateNextExportCode());
    }

    @GetMapping("/history")
    @Operation(summary = "View export slip history")
    @PreAuthorize("hasAuthority('export:view')")
    public ApiResponse<List<InventoryDocumentResponse>> getExportHistory(
            @RequestParam(required = false) String docCode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) String issuePurpose,
            @RequestParam(required = false) String referenceType,
            @RequestParam(required = false) Long referenceId
    ) {
        return ApiResponse.success(inventoryDocumentService.getExportHistory(
                docCode, fromDate, toDate, status, warehouseId, issuePurpose, referenceType, referenceId
        ));
    }

    @GetMapping("/{id}")
    @Operation(summary = "View export slip detail")
    @PreAuthorize("hasAuthority('export:view')")
    public ApiResponse<InventoryDocumentResponse> getExportDetail(@PathVariable Long id) {
        return ApiResponse.success(inventoryDocumentService.getExportDetail(id));
    }

    @PostMapping("/resolve-scan")
    @Operation(summary = "Resolve scanned product barcode or serial")
    @PreAuthorize("hasAuthority('export:add') or hasAuthority('export:edit')")
    public ApiResponse<ScanResolveResponse> resolveScan(@RequestBody ScanResolveRequest req) {
        return ApiResponse.success(inventoryDocumentService.resolveExportScan(req));
    }

    @PostMapping("/create")
    @Operation(summary = "Create export slip")
    @PreAuthorize("hasAuthority('export:add')")
    public ApiResponse<InventoryDocumentResponse> createExport(@Valid @RequestBody InventoryDocumentRequest req, jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            InventoryDocumentResponse created = inventoryDocumentService.createExport(req);
            auditLogService.logEvent(
                actor,
                "CREATE",
                "ExportSlip",
                created.getId(),
                "SUCCESS",
                "Tạo phiếu xuất kho " + created.getDocCode(),
                ip,
                null
            );
            return ApiResponse.success(created);
        } catch (Exception e) {
            auditLogService.logEvent(
                actor,
                "CREATE",
                "ExportSlip",
                null,
                "FAILED",
                "Tạo phiếu xuất kho thất bại: " + e.getMessage(),
                ip,
                null
            );
            throw e;
        }
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update export slip")
    @PreAuthorize("hasAuthority('export:edit')")
    public ApiResponse<InventoryDocumentResponse> updateExport(
            @PathVariable Long id,
            @Valid @RequestBody InventoryDocumentRequest req,
            jakarta.servlet.http.HttpServletRequest servletRequest
    ) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            InventoryDocumentResponse updated = inventoryDocumentService.updateExport(id, req);
            auditLogService.logEvent(
                actor,
                "UPDATE",
                "ExportSlip",
                id,
                "SUCCESS",
                "Cập nhật phiếu xuất kho " + updated.getDocCode(),
                ip,
                null
            );
            return ApiResponse.success(updated);
        } catch (Exception e) {
            auditLogService.logEvent(
                actor,
                "UPDATE",
                "ExportSlip",
                id,
                "FAILED",
                "Cập nhật phiếu xuất kho ID " + id + " thất bại: " + e.getMessage(),
                ip,
                null
            );
            throw e;
        }
    }

    @PostMapping("/{id}/post")
    @Operation(summary = "Post export slip (Ghi Sổ)")
    @PreAuthorize("hasAuthority('export:edit')")
    public ApiResponse<InventoryDocumentResponse> postExport(@PathVariable Long id, jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            InventoryDocumentResponse posted = inventoryDocumentService.postExport(id);
            auditLogService.logEvent(
                actor,
                "POST",
                "ExportSlip",
                id,
                "SUCCESS",
                "Ghi sổ phiếu xuất kho " + posted.getDocCode(),
                ip,
                null
            );
            return ApiResponse.success(posted);
        } catch (Exception e) {
            auditLogService.logEvent(
                actor,
                "POST",
                "ExportSlip",
                id,
                "FAILED",
                "Ghi sổ phiếu xuất kho ID " + id + " thất bại: " + e.getMessage(),
                ip,
                null
            );
            throw e;
        }
    }

    // ─── Tạo phiếu xuất kho nhanh từ Sales Order đã duyệt ───────────────
    @PostMapping("/from-sales-order/{soId}")
    @Operation(summary = "Tạo draft phiếu xuất kho từ Sales Order đã duyệt")
    @PreAuthorize("hasAuthority('export:add') or hasAuthority('sales_order:edit')")
    public ApiResponse<InventoryDocumentResponse> createExportFromSalesOrder(
            @PathVariable Long soId,
            jakarta.servlet.http.HttpServletRequest servletRequest
    ) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            Long actorUserId = userRepository.findByUsername(actor)
                    .map(u -> u.getId()).orElse(1L);

            InventoryDocumentResponse created = inventoryDocumentService.createExportFromSalesOrder(soId, actorUserId);
            auditLogService.logEvent(actor, "CREATE", "ExportSlip", created.getId(), "SUCCESS",
                    "Tạo phiếu xuất từ SO ID " + soId + ": " + created.getDocCode(), ip, null);
            return ApiResponse.success(created);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "CREATE", "ExportSlip", null, "FAILED",
                    "Tạo phiếu xuất từ SO ID " + soId + " thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }
}


