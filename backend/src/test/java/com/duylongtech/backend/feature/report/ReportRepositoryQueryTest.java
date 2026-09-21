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
