package com.duylongtech.backend.feature.report;

import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.product.ProductService;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.warehouse.WarehouseAccessGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReportServiceTest {
    private ReportRepository reportRepository;
    private WarehouseAccessGuard warehouseAccessGuard;
    private ReportService reportService;

    @BeforeEach
    void setUp() {
        reportRepository = mock(ReportRepository.class);
        warehouseAccessGuard = mock(WarehouseAccessGuard.class);
        reportService = new ReportService(
                reportRepository,
                mock(ProductService.class),
                mock(SalesOrderRepository.class),
                warehouseAccessGuard);
    }

    @Test
    void repairProfitUsesEveryAssignedWarehouseWhenNoWarehouseWasSelected() {
        when(warehouseAccessGuard.resolveAllowedWarehouseIds()).thenReturn(List.of(3L, 7L));

        reportService.getRepairProfitReport(null, null, "repair", null);

        verify(reportRepository).getRepairProfitReport(null, null, "repair", List.of(3L, 7L));
    }

    @Test
    void repairProfitUsesOnlyTheSelectedAccessibleWarehouse() {
        when(warehouseAccessGuard.resolveAllowedWarehouseIds()).thenReturn(List.of(3L, 7L));
        LocalDateTime start = LocalDate.of(2026, 9, 1).atStartOfDay();
        LocalDateTime end = LocalDate.of(2026, 9, 30).atTime(23, 59, 59);

        reportService.getRepairProfitReport(start, end, null, 7L);

        verify(reportRepository).getRepairProfitReport(
                LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30), null, List.of(7L));
    }

    @Test
    void repairProfitRejectsWarehouseOutsideTheAssignment() {
        when(warehouseAccessGuard.resolveAllowedWarehouseIds()).thenReturn(List.of(3L));

        assertThrows(BusinessException.class,
                () -> reportService.getRepairProfitReport(null, null, null, 7L));

        verify(reportRepository, never()).getRepairProfitReport(null, null, null, List.of(7L));
    }

    @Test
    void warehouseReportsOnlyCoverAssignedWarehousesWhenNoWarehouseWasSelected() {
        when(warehouseAccessGuard.resolveAllowedWarehouseIds()).thenReturn(List.of(3L, 7L));

        reportService.getInventoryBalanceReport(null, null);
        reportService.getStockLedgerReport(null, null, null, null);
        reportService.getStockTransferReport(null, null, null, null, null);
        reportService.getInventorySummaryReport(null, null, null, null);

        verify(reportRepository).getInventoryBalanceReport(null, List.of(3L, 7L));
        verify(reportRepository).getStockLedgerReport(List.of(3L, 7L), null, null, null);
        verify(reportRepository).getStockTransferReport(List.of(3L, 7L), null, null, null, null);
        verify(reportRepository).getInventorySummaryReport(List.of(3L, 7L), null, null, null);
    }

    @Test
    void warehouseReportsAreUnrestrictedForManagers() {
        when(warehouseAccessGuard.resolveAllowedWarehouseIds()).thenReturn(null);

        reportService.getInventoryBalanceReport("RAM", null);

        verify(reportRepository).getInventoryBalanceReport("RAM", null);
    }

    @Test
    void warehouseReportsRejectWarehouseOutsideTheAssignment() {
        when(warehouseAccessGuard.resolveAllowedWarehouseIds()).thenReturn(List.of(3L));

        assertThrows(BusinessException.class, () -> reportService.getInventoryBalanceReport(null, 7L));
        assertThrows(BusinessException.class, () -> reportService.getStockLedgerReport(7L, null, null, null));
        assertThrows(BusinessException.class, () -> reportService.getStockTransferReport(7L, null, null, null, null));
        assertThrows(BusinessException.class, () -> reportService.getInventorySummaryReport(7L, null, null, null));
    }

    @Test
    void excelExportAppliesTheSameWarehouseScope() {
        when(warehouseAccessGuard.resolveAllowedWarehouseIds()).thenReturn(List.of(3L));

        assertThrows(BusinessException.class,
                () -> reportService.exportReportToExcel("inventory-balance", 7L, null, null, null, null, null));

        reportService.exportReportToExcel("inventory-balance", null, null, null, null, null, null);
        verify(reportRepository).getInventoryBalanceReport(null, List.of(3L));
    }

    @Test
    void repairProfitRejectsAnInvertedDateRange() {
        LocalDateTime start = LocalDate.of(2026, 10, 1).atStartOfDay();
        LocalDateTime end = LocalDate.of(2026, 9, 30).atTime(23, 59, 59);

        assertThrows(BusinessException.class,
                () -> reportService.getRepairProfitReport(start, end, null, null));
    }
}
