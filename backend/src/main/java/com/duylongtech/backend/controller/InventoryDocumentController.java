package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.InventoryDocumentRequest;
import com.duylongtech.backend.dto.response.InventoryDocumentResponse;
import com.duylongtech.backend.dto.response.InventoryDocumentLineResponse;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.service.InventoryDocumentService;
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

    @PostMapping("/create")
    @PreAuthorize("hasAnyRole('MANAGER','STAFF')")
    public ApiResponse<InventoryDocumentResponse> createExport(@RequestBody InventoryDocumentRequest req) {
        return ApiResponse.success(inventoryDocumentService.createExport(req));
    }
}
