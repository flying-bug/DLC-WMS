package com.duylongtech.backend.feature.report;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
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
    void inventorySummaryIsPerVariantAndNetsUnpostReversals() {
        CapturingJdbcTemplate jdbcTemplate = new CapturingJdbcTemplate();
        ReportRepository repository = new ReportRepository(jdbcTemplate);
        LocalDate start = LocalDate.of(2026, 9, 1);
        LocalDateTime end = LocalDate.of(2026, 9, 30).atTime(23, 59, 59);

        repository.getInventorySummaryReport(List.of(3L), start.atStartOfDay(), end, "RAM");

        String sql = jdbcTemplate.sql;
        // Cùng cấp chi tiết với báo cáo tồn kho: mỗi (kho, SKU) một dòng
        assertTrue(sql.contains("pv.sku AS productCode"));
        assertTrue(sql.contains("GROUP BY w.id, w.name, pv.id"));
        // Bỏ ghi sổ trừ vào đúng cột của chứng từ gốc thay vì cộng sang cột ngược lại
        assertTrue(sql.contains("CASE WHEN l.movement_type LIKE 'UNPOST%' THEN -l.quantity_out ELSE l.quantity_in END"));
        assertTrue(sql.contains("CASE WHEN l.movement_type LIKE 'UNPOST%' THEN -l.quantity_in ELSE l.quantity_out END"));
        // Thứ tự tham số: 2 mốc tồn đầu, 8 mốc trong kỳ, ngày snapshot, cuối kỳ, kho, 4 từ khóa.
        assertEquals(17, jdbcTemplate.args.length);
        assertEquals(start.minusDays(1), jdbcTemplate.args[10]);
        assertEquals(end, jdbcTemplate.args[11]);
        assertEquals(3L, jdbcTemplate.args[12]);
        assertEquals("%RAM%", jdbcTemplate.args[13]);
    }

    @Test
    void reportsWithoutADateRangeCoverTheWholeHistoryInsteadOfComparingWithNull() {
        CapturingJdbcTemplate jdbcTemplate = new CapturingJdbcTemplate();
        ReportRepository repository = new ReportRepository(jdbcTemplate);

        repository.getDebtReport(null, null, null, null);
        for (int i = 0; i < 5; i++) {
            assertNotNull(jdbcTemplate.args[i], "debt date param " + i);
        }
        assertTrue(jdbcTemplate.sql.contains("HAVING openingBalance <> 0 OR debitIncrease <> 0 OR creditDecrease <> 0"));

        repository.getInventorySummaryReport(null, null, null, null);
        for (int i = 0; i < 12; i++) {
            assertNotNull(jdbcTemplate.args[i], "inventory summary date param " + i);
        }
    }

    @Test
    void stockLedgerClassifiesByReferenceDocumentAndSeparatesReversals() {
        CapturingJdbcTemplate jdbcTemplate = new CapturingJdbcTemplate();
        ReportRepository repository = new ReportRepository(jdbcTemplate);

        repository.getStockLedgerReport(null, null, null, "SSD");

        String sql = jdbcTemplate.sql;
        assertTrue(sql.contains("'UNPOST_EX'"));
        assertTrue(sql.contains("doc.reference_type IN ('STOCKTAKE', 'STOCK_TAKE', 'STOCKTAKE_ADJUSTMENT')"));
        assertTrue(sql.contains("doc.issue_purpose IN ('REPAIR', 'SCRAP')"));
        assertTrue(sql.contains("doc.issue_purpose IN ('ASSEMBLY', 'PRODUCTION')"));
        assertTrue(sql.contains("pv.sku AS productCode"));
        assertEquals(List.of("%SSD%", "%SSD%", "%SSD%", "%SSD%"), List.of(jdbcTemplate.args));
    }

    @Test
    void stockTransferListsInTransitTransfersByDefault() {
        CapturingJdbcTemplate jdbcTemplate = new CapturingJdbcTemplate();
        ReportRepository repository = new ReportRepository(jdbcTemplate);

        repository.getStockTransferReport(null, null, null, null, null);

        assertTrue(jdbcTemplate.sql.contains("st.status IN ('APPROVED', 'IN_TRANSIT', 'POSTED')"));
    }

    @Test
    void repairProfitLeavesFreeWarrantyItemsOutOfRevenue() {
        CapturingJdbcTemplate jdbcTemplate = new CapturingJdbcTemplate();
        ReportRepository repository = new ReportRepository(jdbcTemplate);

        repository.getRepairProfitReport(null, null, null, null);

        assertTrue(jdbcTemplate.sql.contains("action_type IN ('ADD', 'REPLACE') AND NOT is_free_warranty"));
        assertTrue(jdbcTemplate.sql.contains("SUM(CASE WHEN NOT is_free_warranty THEN COALESCE(quantity, 1) * fee_amount"));
    }

    @Test
    void serialStockFollowsTheProductSerialFlagLikeTheInventoryScreen() {
        CapturingJdbcTemplate jdbcTemplate = new CapturingJdbcTemplate();
        ReportRepository repository = new ReportRepository(jdbcTemplate);

        repository.getInventoryBalanceReport(null, null);

        assertTrue(jdbcTemplate.sql.contains("COALESCE(p.track_serial, 0) = 1"));
        assertFalse(jdbcTemplate.sql.contains("tracking_mode"));
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
