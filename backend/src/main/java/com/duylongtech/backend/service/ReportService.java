package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.response.report.*;
import org.springframework.data.domain.Page;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface ReportService {
    List<InventoryBalanceReportResponse> getInventoryBalanceReport(String search, Long warehouseId);
    
    List<StockLedgerReportResponse> getStockLedgerReport(Long warehouseId, LocalDateTime startDate, LocalDateTime endDate, String search);
    
    List<StockTransferReportResponse> getStockTransferReport(Long warehouseId, LocalDate startDate, LocalDate endDate, String search, String status);
    
    List<DebtReportResponse> getDebtReport(LocalDateTime startDate, LocalDateTime endDate, String search, String partnerType);
    
    List<InventorySummaryReportResponse> getInventorySummaryReport(Long warehouseId, LocalDateTime startDate, LocalDateTime endDate, String search);
    
    DashboardResponse getDashboardMetrics();

    byte[] exportReportToExcel(String reportType, Long warehouseId, LocalDateTime startDate, LocalDateTime endDate, String search, String partnerType, String status);
}
