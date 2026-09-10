package com.duylongtech.backend.controller;

import com.duylongtech.backend.annotation.Auditable;
import com.duylongtech.backend.enums.AuditAction;
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
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) String issuePurpose,
            @RequestParam(required = false) String referenceType,
            @RequestParam(required = false) Long referenceId,
            @RequestParam(required = false) Long partnerId,
            @RequestParam(required = false) Long salespersonId
    ) {
        return ApiResponse.success(inventoryDocumentService.getExportHistory(
                keyword, fromDate, toDate, status, warehouseId, issuePurpose, referenceType, referenceId, partnerId, salespersonId
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

    @PostMapping("/resolve-barcode")
    @Operation(summary = "Resolve generic scanned product barcode or serial")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<ScanResolveResponse> resolveBarcode(@RequestBody ScanResolveRequest req) {
        return ApiResponse.success(inventoryDocumentService.resolveGenericScan(req));
    }

    @PostMapping("/create")
    @Operation(summary = "Create export slip")
    @PreAuthorize("hasAuthority('export:add')")
    @Auditable(action = AuditAction.CREATE, entityName = "ExportSlip", actionDescription = "Tạo phiếu xuất kho")
    public ApiResponse<InventoryDocumentResponse> createExport(@Valid @RequestBody InventoryDocumentRequest req) {
        return ApiResponse.success(inventoryDocumentService.createExport(req));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update export slip")
    @PreAuthorize("hasAuthority('export:edit')")
    @Auditable(action = AuditAction.UPDATE, entityName = "ExportSlip", actionDescription = "Cập nhật phiếu xuất kho")
    public ApiResponse<InventoryDocumentResponse> updateExport(
            @PathVariable Long id,
            @Valid @RequestBody InventoryDocumentRequest req
    ) {
        return ApiResponse.success(inventoryDocumentService.updateExport(id, req));
    }

    @PostMapping("/{id}/post")
    @Operation(summary = "Post export slip (Ghi Sổ)")
    @PreAuthorize("hasAuthority('export:edit')")
    @Auditable(action = AuditAction.POST, entityName = "ExportSlip", actionDescription = "Ghi sổ phiếu xuất kho")
    public ApiResponse<InventoryDocumentResponse> postExport(@PathVariable Long id) {
        return ApiResponse.success(inventoryDocumentService.postExport(id));
    }

    // ─── Tạo phiếu xuất kho nhanh từ Sales Order đã duyệt ───────────────
    @PostMapping("/from-sales-order/{soId}")
    @Operation(summary = "Tạo draft phiếu xuất kho từ Sales Order đã duyệt")
    @PreAuthorize("hasAuthority('export:add') or hasAuthority('sales_order:edit')")
    @Auditable(action = AuditAction.CREATE, entityName = "ExportSlip", actionDescription = "Tạo phiếu xuất kho từ Sales Order")
    public ApiResponse<InventoryDocumentResponse> createExportFromSalesOrder(
            @PathVariable Long soId
    ) {
        String actor = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        Long actorUserId = userRepository.findByUsername(actor)
                .map(com.duylongtech.backend.entity.User::getId).orElse(1L);

        return ApiResponse.success(inventoryDocumentService.createExportFromSalesOrder(soId, actorUserId));
    }

    @GetMapping("/{id}/check-unpost")
    @Operation(summary = "Check if export slip can be safely unposted")
    @PreAuthorize("hasAuthority('export:edit') or hasAuthority('export:add')")
    public ApiResponse<com.duylongtech.backend.dto.response.DependencyCheckResponse> checkUnpost(@PathVariable Long id) {
        return ApiResponse.success(inventoryDocumentService.checkExportUnpostable(id));
    }

    @PostMapping("/{id}/unpost")
    @Operation(summary = "Unpost export slip and rollback inventory safely")
    @PreAuthorize("hasAuthority('export:edit') or hasAuthority('export:add')")
    @Auditable(action = AuditAction.UNPOST, entityName = "ExportSlip", actionDescription = "Bỏ ghi sổ phiếu xuất kho")
    public ApiResponse<InventoryDocumentResponse> unpostExport(
            @PathVariable Long id,
            @RequestParam(required = false) String reason
    ) {
        String actor = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        Long currentUserId = userRepository.findByUsername(actor).map(com.duylongtech.backend.entity.User::getId).orElse(null);
        return ApiResponse.success(inventoryDocumentService.unpostExport(id, reason, currentUserId));
    }

    @GetMapping("/{id}/logs")
    @Operation(summary = "Get all audit logs for this export document")
    @PreAuthorize("hasAuthority('export:view') or hasAuthority('export:edit') or hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    public ApiResponse<List<com.duylongtech.backend.dto.response.AuditLogResponse>> getExportLogs(@PathVariable Long id) {
        org.springframework.data.domain.Page<com.duylongtech.backend.entity.AuditLog> page = auditLogService.getLogsForEntity("ExportSlip", id, 0, 100);
        List<com.duylongtech.backend.dto.response.AuditLogResponse> logs = page.getContent().stream()
                .map(l -> com.duylongtech.backend.dto.response.AuditLogResponse.builder()
                        .id(l.getId())
                        .timestamp(l.getCreatedAt() != null ? l.getCreatedAt().toString() : "")
                        .user(l.getUser() != null ? (l.getUser().getFullName() != null ? l.getUser().getFullName() : l.getUser().getUsername()) : "Hệ thống")
                        .action(l.getAction())
                        .description(l.getDescription())
                        .status(l.getStatus())
                        .build())
                .collect(java.util.stream.Collectors.toList());
        return ApiResponse.success(logs);
    }
}



