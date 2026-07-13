package com.duylongtech.backend.service.impl;

import com.duylongtech.backend.dto.response.report.*;
import com.duylongtech.backend.repository.ReportRepository;
import com.duylongtech.backend.service.ReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportServiceImpl implements ReportService {

    private final ReportRepository reportRepository;

    @Override
    public List<InventoryBalanceReportResponse> getInventoryBalanceReport(String search, Long warehouseId) {
        log.info("Fetching Inventory Balance Report. warehouseId={}, search={}", warehouseId, search);
        return reportRepository.getInventoryBalanceReport(search, warehouseId);
    }

    @Override
    public List<StockLedgerReportResponse> getStockLedgerReport(Long warehouseId, LocalDateTime startDate, LocalDateTime endDate, String search) {
        log.info("Fetching Stock Ledger Report. warehouseId={}, startDate={}, endDate={}, search={}", warehouseId, startDate, endDate, search);
        return reportRepository.getStockLedgerReport(warehouseId, startDate, endDate, search);
    }

    @Override
    public List<StockTransferReportResponse> getStockTransferReport(Long warehouseId, LocalDate startDate, LocalDate endDate, String search, String status) {
        log.info("Fetching Stock Transfer Report. warehouseId={}, startDate={}, endDate={}, search={}, status={}", warehouseId, startDate, endDate, search, status);
        return reportRepository.getStockTransferReport(warehouseId, startDate, endDate, search, status);
    }

    @Override
    public List<DebtReportResponse> getDebtReport(LocalDateTime startDate, LocalDateTime endDate, String search) {
        log.info("Fetching Debt Report. startDate={}, endDate={}, search={}", startDate, endDate, search);
        return reportRepository.getDebtReport(startDate, endDate, search);
    }

    @Override
    public List<InventorySummaryReportResponse> getInventorySummaryReport(Long warehouseId, LocalDateTime startDate, LocalDateTime endDate, String search) {
        log.info("Fetching Inventory Summary Report. warehouseId={}, startDate={}, endDate={}, search={}", warehouseId, startDate, endDate, search);
        return reportRepository.getInventorySummaryReport(warehouseId, startDate, endDate, search);
    }

    @Override
    public DashboardResponse getDashboardMetrics() {
        log.info("Fetching Dashboard Metrics");
        return reportRepository.getDashboardMetrics();
    }
}
