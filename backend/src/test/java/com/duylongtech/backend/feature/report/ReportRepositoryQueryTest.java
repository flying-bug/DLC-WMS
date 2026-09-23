package com.duylongtech.backend.feature.report;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ReportRepositoryQueryTest {

    @Test
    void inventoryBalanceFallsBackToAverageCostWhenFifoQuantityDoesNotMatch() {
        CapturingJdbcTemplate jdbcTemplate = new CapturingJdbcTemplate();
        ReportRepository repository = new ReportRepository(jdbcTemplate);

        repository.getInventoryBalanceReport(null, null);

        assertTrue(jdbcTemplate.sql.contains("ABS(COALESCE(fifo.fifo_quantity, 0) - balances.balance_quantity)"));
        assertTrue(jdbcTemplate.sql.contains("ELSE balances.balance_value"));
        assertTrue(jdbcTemplate.sql.contains("valuation.inventory_value"));
    }

    @Test
    void repairProfitAppliesEveryAllowedWarehouseToTheSql() {
        CapturingJdbcTemplate jdbcTemplate = new CapturingJdbcTemplate();
        ReportRepository repository = new ReportRepository(jdbcTemplate);

        repository.getRepairProfitReport(
                LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30), "SC", List.of(3L, 7L));

        assertTrue(jdbcTemplate.sql.contains("r.warehouse_id IN (?, ?)"));
        assertEquals(9, jdbcTemplate.args.length);
        assertEquals(3L, jdbcTemplate.args[7]);
        assertEquals(7L, jdbcTemplate.args[8]);
    }

    @Test
    void repairProfitReturnsNoRowsWithoutQueryingWhenUserHasNoWarehouse() {
        CapturingJdbcTemplate jdbcTemplate = new CapturingJdbcTemplate();
        ReportRepository repository = new ReportRepository(jdbcTemplate);

        List<RepairProfitReportResponse> result = repository.getRepairProfitReport(null, null, null, List.of());

        assertTrue(result.isEmpty());
        assertFalse(jdbcTemplate.called);
    }

    @Test
    void stockTransferMatchesEitherSideOfTheTransferAgainstAllowedWarehouses() {
        CapturingJdbcTemplate jdbcTemplate = new CapturingJdbcTemplate();
        ReportRepository repository = new ReportRepository(jdbcTemplate);

        repository.getStockTransferReport(List.of(3L, 7L), null, null, null, null);

        assertTrue(jdbcTemplate.sql.contains("(st.from_warehouse_id IN (?, ?) OR st.to_warehouse_id IN (?, ?))"));
        assertEquals(List.of(3L, 7L, 3L, 7L), List.of(jdbcTemplate.args));
    }

    @Test
    void warehouseReportsReturnNoRowsWithoutQueryingWhenUserHasNoWarehouse() {
        CapturingJdbcTemplate jdbcTemplate = new CapturingJdbcTemplate();
        ReportRepository repository = new ReportRepository(jdbcTemplate);

        assertTrue(repository.getInventoryBalanceReport(null, List.of()).isEmpty());
        assertTrue(repository.getStockLedgerReport(List.of(), null, null, null).isEmpty());
        assertTrue(repository.getStockTransferReport(List.of(), null, null, null, null).isEmpty());
        assertTrue(repository.getInventorySummaryReport(List.of(), null, null, null).isEmpty());
        assertFalse(jdbcTemplate.called);
    }

    @Test
    void inventorySummaryComputesOpeningPerVariantBeforeSummingPerProduct() {
        CapturingJdbcTemplate jdbcTemplate = new CapturingJdbcTemplate();
        ReportRepository repository = new ReportRepository(jdbcTemplate);
        LocalDate start = LocalDate.of(2026, 9, 1);

        repository.getInventorySummaryReport(List.of(3L), start.atStartOfDay(),
                LocalDate.of(2026, 9, 30).atTime(23, 59, 59), "RAM");

        String sql = jdbcTemplate.sql;
        // Snapshot được lấy trong bảng con gom theo (kho, biến thể), bảng ngoài chỉ cộng lên theo sản phẩm.
        assertTrue(sql.indexOf("MAX(ids.closing_quantity)") > sql.indexOf("FROM ("));
        assertTrue(sql.contains("GROUP BY l.warehouse_id, l.variant_id, pv.product_id"));
        assertTrue(sql.contains("SUM(v.openingQuantity)"));
        // Thứ tự tham số: 10 mốc ngày, ngày snapshot, kho, 2 từ khóa.
        assertEquals(14, jdbcTemplate.args.length);
        assertEquals(start.minusDays(1), jdbcTemplate.args[10]);
        assertEquals(3L, jdbcTemplate.args[11]);
        assertEquals("%RAM%", jdbcTemplate.args[12]);
    }

    private static final class CapturingJdbcTemplate extends JdbcTemplate {
        private String sql;
        private Object[] args;
        private boolean called;

        @Override
        public <T> List<T> query(String sql, RowMapper<T> rowMapper, Object... args) {
            this.called = true;
            this.sql = sql;
            this.args = args;
            return List.of();
        }
    }
}
