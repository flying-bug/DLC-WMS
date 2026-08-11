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
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final com.duylongtech.backend.repository.InventoryBalanceRepository inventoryBalanceRepository;

    @GetMapping("/debug-balances")
    @PreAuthorize("hasAuthority('report_balance:view') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<com.duylongtech.backend.entity.InventoryBalance>> debugBalances() {
        return ResponseEntity.ok(inventoryBalanceRepository.findAll());
    }

    @GetMapping("/inventory-balance")
    @PreAuthorize("hasAuthority('report_balance:view') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<InventoryBalanceReportResponse>>> getInventoryBalanceReport(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long warehouseId) {
        return ResponseEntity.ok(ApiResponse.<List<InventoryBalanceReportResponse>>builder()
                .success(true)
                .data(reportService.getInventoryBalanceReport(search, warehouseId))
                .build());
    }

    @GetMapping("/stock-ledger")
    @PreAuthorize("hasAuthority('report_ledger:view') or hasRole('SUPER_ADMIN')")
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
    @PreAuthorize("hasAuthority('report_transfer:view') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<StockTransferReportResponse>>> getStockTransferReport(
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        
        LocalDate start = startDate != null ? startDate.toLocalDate() : null;
        LocalDate end = endDate != null ? endDate.toLocalDate() : null;
        
        return ResponseEntity.ok(ApiResponse.<List<StockTransferReportResponse>>builder()
                .success(true)
                .data(reportService.getStockTransferReport(warehouseId, start, end, search, status))
                .build());
    }

    @GetMapping("/debt")
    @PreAuthorize("hasAuthority('report_debt:view') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<DebtReportResponse>>> getDebtReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String partnerType) {
        if (startDate == null) startDate = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        if (endDate == null) {
            endDate = LocalDate.now().atTime(23, 59, 59);
        } else if (endDate.toLocalTime().equals(LocalTime.MIDNIGHT)) {
            endDate = endDate.with(LocalTime.MAX);
        }

        return ResponseEntity.ok(ApiResponse.<List<DebtReportResponse>>builder()
                .success(true)
                .data(reportService.getDebtReport(startDate, endDate, search, partnerType))
                .build());
    }

    @GetMapping("/inventory-summary")
    @PreAuthorize("hasAuthority('report_summary:view') or hasRole('SUPER_ADMIN')")
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
    @PreAuthorize("hasAuthority('report_summary:view') or hasRole('SUPER_ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboardMetrics(
            @RequestParam(required = false, defaultValue = "7days") String inventoryFlowRange,
            @RequestParam(required = false, defaultValue = "all") String categoryScope,
            @RequestParam(required = false) String financeRange) {
        return ResponseEntity.ok(ApiResponse.<DashboardResponse>builder()
                .success(true)
                .data(reportService.getDashboardMetrics(inventoryFlowRange, categoryScope, financeRange))
                .build());
    }

    @GetMapping("/export/{reportType}")
    @PreAuthorize("(#reportType == 'inventory-balance' and hasAuthority('report_balance:export'))"
            + " or (#reportType == 'stock-ledger' and hasAuthority('report_ledger:export'))"
            + " or (#reportType == 'stock-transfers' and hasAuthority('report_transfer:export'))"
            + " or (#reportType == 'debt' and hasAuthority('report_debt:export'))"
            + " or (#reportType == 'inventory-summary' and hasAuthority('report_summary:export'))"
            + " or hasRole('SUPER_ADMIN')")
    public ResponseEntity<byte[]> exportReport(
            @PathVariable String reportType,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String partnerType,
            @RequestParam(required = false) String status) {
        
        // Defaults matching query methods
        if ("debt".equals(reportType) || "inventory-summary".equals(reportType)) {
            if (startDate == null) startDate = LocalDate.now().withDayOfMonth(1).atStartOfDay();
            if (endDate == null) endDate = LocalDate.now().plusDays(1).atStartOfDay();
        }

        byte[] excelBytes = reportService.exportReportToExcel(reportType, warehouseId, startDate, endDate, search, partnerType, status);
        
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        String timestamp = java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String filename = "Bao_Cao_" + reportType + "_" + timestamp + ".xlsx";
        headers.add("Content-Disposition", "attachment; filename=\"" + filename + "\"");
        
        return ResponseEntity.ok()
                .headers(headers)
                .contentType(org.springframework.http.MediaType
                        .parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }
}
