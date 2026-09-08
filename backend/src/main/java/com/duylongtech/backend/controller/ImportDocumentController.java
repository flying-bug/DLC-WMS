package com.duylongtech.backend.controller;

import jakarta.validation.Valid;
import com.duylongtech.backend.dto.request.InventoryDocumentRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.InventoryDocumentResponse;
import com.duylongtech.backend.dto.response.OcrImportResponse;
import com.duylongtech.backend.service.AuditLogService;
import com.duylongtech.backend.service.ImportOcrService;
import com.duylongtech.backend.service.InventoryDocumentService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/imports")
@RequiredArgsConstructor
public class ImportDocumentController {

    private final InventoryDocumentService inventoryDocumentService;
    private final AuditLogService auditLogService;
    private final ImportOcrService importOcrService;
    private final com.duylongtech.backend.repository.UserRepository userRepository;

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
    @Operation(summary = "Get next import slip code")
    @PreAuthorize("hasAuthority('import:view') or hasAuthority('import:add')")
    public ApiResponse<String> getNextImportCode() {
        return ApiResponse.success(inventoryDocumentService.generateNextImportCode());
    }

    @GetMapping("/history")
    @Operation(summary = "View import slip history")
    @PreAuthorize("hasAuthority('import:view')")
    public ApiResponse<List<InventoryDocumentResponse>> getImportHistory(
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
        return ApiResponse.success(inventoryDocumentService.getImportHistory(
                keyword, fromDate, toDate, status, warehouseId, issuePurpose, referenceType, referenceId, partnerId, salespersonId
        ));
    }

    @GetMapping("/{id}")
    @Operation(summary = "View import slip detail")
    @PreAuthorize("hasAuthority('import:view')")
    public ApiResponse<InventoryDocumentResponse> getImportDetail(@PathVariable Long id) {
        return ApiResponse.success(inventoryDocumentService.getImportDetail(id));
    }

    @PostMapping("/create")
    @Operation(summary = "Create import slip")
    @PreAuthorize("hasAuthority('import:add')")
    public ApiResponse<InventoryDocumentResponse> createImport(
            @Valid @RequestBody InventoryDocumentRequest req,
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
    @PreAuthorize("hasAuthority('import:edit')")
    public ApiResponse<InventoryDocumentResponse> updateImport(
            @PathVariable Long id,
            @Valid @RequestBody InventoryDocumentRequest req,
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
    @PreAuthorize("hasAuthority('import:edit')")
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

    // ==========================================
    // OCR - AI Document Processing
    // ==========================================

    @GetMapping("/ocr-session/init")
    @Operation(summary = "Khởi tạo phiên quét OCR từ Desktop")
    public ApiResponse<String> initOcrSession() {
        return ApiResponse.success(importOcrService.initSession());
    }

    @GetMapping("/ocr-session/{sessionId}")
    @Operation(summary = "Lấy trạng thái của phiên quét OCR")
    public ApiResponse<ImportOcrService.OcrSessionData> getOcrSessionState(@PathVariable String sessionId) {
        return ApiResponse.success(importOcrService.getSessionState(sessionId));
    }

    @PostMapping(value = "/ocr-session/{sessionId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Mobile gửi ảnh lên để OCR cho một session cụ thể")
    public ApiResponse<String> uploadOcrForSession(
            @PathVariable String sessionId,
            @RequestParam("file") MultipartFile file) {
        importOcrService.scanDocumentForSession(sessionId, file);
        return ApiResponse.success("Đang xử lý ảnh trên máy chủ...");
    }

    @PostMapping(value = "/ocr-scan", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "OCR scan import document (invoice/delivery note image)")
    @PreAuthorize("hasAuthority('import:add')")
    public ApiResponse<OcrImportResponse> ocrScan(
            @RequestParam("file") MultipartFile file
    ) {
        return ApiResponse.success(importOcrService.scanDocument(file));
    }

    @GetMapping("/{id}/check-unpost")
    @Operation(summary = "Check if import slip can be safely unposted")
    @PreAuthorize("hasAuthority('import:edit') or hasAuthority('import:add')")
    public ApiResponse<com.duylongtech.backend.dto.response.DependencyCheckResponse> checkUnpost(@PathVariable Long id) {
        return ApiResponse.success(inventoryDocumentService.checkImportUnpostable(id));
    }

    @PostMapping("/{id}/unpost")
    @Operation(summary = "Unpost import slip and rollback inventory safely")
    @PreAuthorize("hasAuthority('import:edit') or hasAuthority('import:add')")
    public ApiResponse<InventoryDocumentResponse> unpostImport(
            @PathVariable Long id,
            @RequestParam(required = false) String reason,
            jakarta.servlet.http.HttpServletRequest request
    ) {
        String actor = getCurrentUser();
        String ip = getClientIp(request);
        Long currentUserId = null;
        try {
            currentUserId = userRepository.findByUsername(actor).map(com.duylongtech.backend.entity.User::getId).orElse(null);
        } catch (Exception ignored) {}
        InventoryDocumentResponse res = inventoryDocumentService.unpostImport(id, reason, currentUserId);
        auditLogService.logEvent(actor, "UNPOST", "ImportSlip", id, "SUCCESS",
                "Bỏ ghi sổ phiếu nhập kho " + res.getDocCode() + ". Lý do: " + (reason != null ? reason : "Không có"),
                ip, null);
        return ApiResponse.success(res);
    }

    @GetMapping("/{id}/logs")
    @Operation(summary = "Get all audit logs for this import document")
    @PreAuthorize("hasAuthority('import:view') or hasAuthority('import:edit') or hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    public ApiResponse<List<com.duylongtech.backend.dto.response.AuditLogResponse>> getImportLogs(@PathVariable Long id) {
        org.springframework.data.domain.Page<com.duylongtech.backend.entity.AuditLog> page = auditLogService.getLogsForEntity("ImportSlip", id, 0, 100);
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


