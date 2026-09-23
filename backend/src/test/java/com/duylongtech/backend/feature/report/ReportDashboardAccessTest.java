package com.duylongtech.backend.feature.report;

import com.duylongtech.backend.feature.product.ProductService;
import com.duylongtech.backend.feature.product.StockAlertSummaryResponse;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.warehouse.WarehouseAccessGuard;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Màn tổng quan chứa dòng tiền, công nợ, giá trị tồn toàn công ty. Thủ kho / Thủ quỹ có report_summary:view (để
 * xem báo cáo kho / công nợ) nhưng không được gọi API tổng quan, khớp với workspaceScope.js ở frontend.
 */
class ReportDashboardAccessTest {

    private ReportRepository reportRepository;
    private ReportService reportService;

    @BeforeEach
    void setUp() {
        reportRepository = mock(ReportRepository.class);
        ProductService productService = mock(ProductService.class);
        when(productService.getStockAlertSummary())
                .thenReturn(StockAlertSummaryResponse.builder().lowStockCount(0).outOfStockCount(0).build());
        when(reportRepository.getDashboardMetrics(any(), any(), any())).thenReturn(new DashboardResponse());
        reportService = new ReportService(reportRepository, productService, mock(SalesOrderRepository.class),
                mock(WarehouseAccessGuard.class));
    }

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    private static void loginAs(String... roles) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("u", null,
                Arrays.stream(roles).map(SimpleGrantedAuthority::new).toList()));
    }

    @Test
    void warehouseControllerCannotLoadTheDashboard() {
        loginAs("ROLE_WAREHOUSE_CONTROLLER", "report_summary:view");

        assertThrows(AccessDeniedException.class, () -> reportService.getDashboardMetrics("7days", "all", null));
        verify(reportRepository, never()).getDashboardMetrics(any(), any(), any());
    }

    @Test
    void cashierCannotLoadTheDashboard() {
        loginAs("ROLE_CASHIER_CONTROLLER", "report_summary:view");

        assertThrows(AccessDeniedException.class, () -> reportService.getDashboardMetrics("7days", "all", null));
    }

    @Test
    void managerAndAccountantCanLoadTheDashboard() {
        loginAs("ROLE_MANAGER", "report_summary:view");
        assertDoesNotThrow(() -> reportService.getDashboardMetrics("7days", "all", null));

        loginAs("ROLE_ACCOUNTANT", "report_summary:view");
        assertDoesNotThrow(() -> reportService.getDashboardMetrics("7days", "all", null));
    }

    @Test
    void managerWhoIsAlsoWarehouseControllerKeepsAccess() {
        loginAs("ROLE_MANAGER", "ROLE_WAREHOUSE_CONTROLLER", "report_summary:view");

        assertDoesNotThrow(() -> reportService.getDashboardMetrics("7days", "all", null));
    }
}
