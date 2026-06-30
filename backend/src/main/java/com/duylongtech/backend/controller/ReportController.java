package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.report.*;
import com.duylongtech.backend.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/inventory-balance")
    @PreAuthorize("hasAuthority('report:view') or hasRole('MANAGER') or hasRole('STAFF')")
    public ResponseEntity<ApiResponse<List<InventoryBalanceReportResponse>>> getInventoryBalanceReport(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long warehouseId) {
        return ResponseEntity.ok(ApiResponse.<List<InventoryBalanceReportResponse>>builder()
                .success(true)
                .data(reportService.getInventoryBalanceReport(search, warehouseId))
                .build());
    }

    @GetMapping("/stock-ledger")
    @PreAuthorize("hasAuthority('report:view') or hasRole('MANAGER') or hasRole('STAFF')")
    public ResponseEntity<ApiResponse<List<StockLedgerReportResponse>>> getStockLedgerReport(
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.<List<StockLedgerReportResponse>>builder()
                .success(true)
                .data(reportService.getStockLedgerReport(warehouseId, startDate, endDate, search))
                .build());
    }

    @GetMapping("/stock-transfers")
    @PreAuthorize("hasAuthority('report:view') or hasRole('MANAGER') or hasRole('STAFF')")
    public ResponseEntity<ApiResponse<List<StockTransferReportResponse>>> getStockTransferReport(
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.<List<StockTransferReportResponse>>builder()
                .success(true)
                .data(reportService.getStockTransferReport(warehouseId, startDate, endDate, search))
                .build());
    }

    @GetMapping("/debt")
    @PreAuthorize("hasAuthority('report:view') or hasRole('MANAGER') or hasRole('STAFF')")
    public ResponseEntity<ApiResponse<List<DebtReportResponse>>> getDebtReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) String search) {
        // Default to start of month and end of month if null
        if (startDate == null) startDate = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        if (endDate == null) endDate = LocalDate.now().plusDays(1).atStartOfDay();

        return ResponseEntity.ok(ApiResponse.<List<DebtReportResponse>>builder()
                .success(true)
                .data(reportService.getDebtReport(startDate, endDate, search))
                .build());
    }

    @GetMapping("/inventory-summary")
    @PreAuthorize("hasAuthority('report:view') or hasRole('MANAGER') or hasRole('STAFF')")
    public ResponseEntity<ApiResponse<List<InventorySummaryReportResponse>>> getInventorySummaryReport(
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) String search) {
        // Default to start of month and end of month if null
        if (startDate == null) startDate = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        if (endDate == null) endDate = LocalDate.now().plusDays(1).atStartOfDay();

        return ResponseEntity.ok(ApiResponse.<List<InventorySummaryReportResponse>>builder()
                .success(true)
                .data(reportService.getInventorySummaryReport(warehouseId, startDate, endDate, search))
                .build());
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('report:view') or hasRole('MANAGER') or hasRole('STAFF')")
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboardMetrics() {
        return ResponseEntity.ok(ApiResponse.<DashboardResponse>builder()
                .success(true)
                .data(reportService.getDashboardMetrics())
                .build());
    }
}
