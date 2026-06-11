package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.InventoryDocumentRequest;
import com.duylongtech.backend.dto.response.InventoryDocumentResponse;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.service.InventoryDocumentService;
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

    @GetMapping("/history")
    @Operation(summary = "View export slip history")
    @PreAuthorize("hasAnyRole('MANAGER','STAFF')")
    public ApiResponse<List<InventoryDocumentResponse>> getExportHistory(
            @RequestParam(required = false) String docCode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long warehouseId
    ) {
        return ApiResponse.success(inventoryDocumentService.getExportHistory(docCode, fromDate, toDate, status, warehouseId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "View export slip detail")
    @PreAuthorize("hasAnyRole('MANAGER','STAFF')")
    public ApiResponse<InventoryDocumentResponse> getExportDetail(@PathVariable Long id) {
        return ApiResponse.success(inventoryDocumentService.getExportDetail(id));
    }

    @PostMapping("/create")
    @Operation(summary = "Create export slip")
    @PreAuthorize("hasAnyRole('MANAGER','STAFF')")
    public ApiResponse<InventoryDocumentResponse> createExport(@RequestBody InventoryDocumentRequest req) {
        return ApiResponse.success(inventoryDocumentService.createExport(req));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update export slip")
    @PreAuthorize("hasAnyRole('MANAGER','STAFF')")
    public ApiResponse<InventoryDocumentResponse> updateExport(
            @PathVariable Long id,
            @RequestBody InventoryDocumentRequest req
    ) {
        return ApiResponse.success(inventoryDocumentService.updateExport(id, req));
    }

    @PostMapping("/{id}/post")
    @Operation(summary = "Post export slip (Ghi Sổ)")
    @PreAuthorize("hasAnyRole('MANAGER','STAFF')")
    public ApiResponse<InventoryDocumentResponse> postExport(@PathVariable Long id) {
        return ApiResponse.success(inventoryDocumentService.postExport(id));
    }
}

