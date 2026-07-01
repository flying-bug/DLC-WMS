package com.duylongtech.backend.repository;

import com.duylongtech.backend.dto.response.report.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class ReportRepository {
    private final JdbcTemplate jdbcTemplate;

    // 1. Inventory Balance Report
    public List<InventoryBalanceReportResponse> getInventoryBalanceReport(String search, Long warehouseId) {
        StringBuilder sql = new StringBuilder(
                "SELECT " +
                        "p.product_code AS itemCode, " +
                        "p.product_name AS itemName, " +
                        "u.name AS unitName, " +
                        "w.code AS warehouseCode, " +
                        "w.name AS warehouseName, " +
                        "SUM(ib.quantity_on_hand) AS totalQuantity, " +
                        "SUM(ib.quantity_on_hand * ib.average_cost) AS totalValue " +
                        "FROM INVENTORY_BALANCES ib " +
                        "JOIN PRODUCT_VARIANTS pv ON ib.variant_id = pv.id " +
                        "JOIN PRODUCTS p ON pv.product_id = p.id " +
                        "JOIN UNITS u ON p.unit_id = u.id " +
                        "JOIN WAREHOUSES w ON ib.warehouse_id = w.id " +
                        "WHERE 1=1 "
        );
        List<Object> params = new ArrayList<>();

        if (warehouseId != null) {
            sql.append(" AND ib.warehouse_id = ? ");
            params.add(warehouseId);
        }
        if (search != null && !search.trim().isEmpty()) {
            sql.append(" AND (p.product_code LIKE ? OR p.product_name LIKE ?) ");
            params.add("%" + search + "%");
            params.add("%" + search + "%");
        }

        sql.append(" GROUP BY p.product_code, p.product_name, u.name, w.code, w.name ");
        sql.append(" ORDER BY w.code, p.product_code ");

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> InventoryBalanceReportResponse.builder()
                .itemCode(rs.getString("itemCode"))
                .itemName(rs.getString("itemName"))
                .unitName(rs.getString("unitName"))
                .warehouseCode(rs.getString("warehouseCode"))
                .warehouseName(rs.getString("warehouseName"))
                .totalQuantity(rs.getBigDecimal("totalQuantity"))
                .totalValue(rs.getBigDecimal("totalValue"))
                .build(), params.toArray());
    }

    // 2. Stock Ledger Report
    public List<StockLedgerReportResponse> getStockLedgerReport(Long warehouseId, LocalDateTime startDate, LocalDateTime endDate, String search) {
        StringBuilder sql = new StringBuilder(
                "SELECT " +
                        "w.name AS warehouseName, " +
                        "p.product_code AS productCode, " +
                        "p.product_name AS productName, " +
                        "doc.note AS description, " +
                        "l.movement_at AS movementAt, " +
                        "doc.doc_code AS documentNumber, " +
                        "doc.doc_type AS documentType, " +
                        "u.name AS unitName, " +
                        "l.unit_cost AS unitPrice, " +
                        "l.quantity_in AS quantityIn, " +
                        "l.quantity_out AS quantityOut, " +
                        "l.balance_after AS balanceAfter " +
                        "FROM INVENTORY_LEDGER l " +
                        "JOIN WAREHOUSES w ON l.warehouse_id = w.id " +
                        "JOIN PRODUCT_VARIANTS pv ON l.variant_id = pv.id " +
                        "JOIN PRODUCTS p ON pv.product_id = p.id " +
                        "JOIN UNITS u ON p.unit_id = u.id " +
                        "JOIN INVENTORY_DOCUMENTS doc ON l.inventory_document_id = doc.id " +
                        "WHERE 1=1 "
        );
        List<Object> params = new ArrayList<>();

        if (warehouseId != null) {
            sql.append(" AND l.warehouse_id = ? ");
            params.add(warehouseId);
        }
        if (startDate != null) {
            sql.append(" AND l.movement_at >= ? ");
            params.add(startDate);
        }
        if (endDate != null) {
            sql.append(" AND l.movement_at <= ? ");
            params.add(endDate);
        }
        if (search != null && !search.trim().isEmpty()) {
            sql.append(" AND (p.product_code LIKE ? OR p.product_name LIKE ?) ");
            params.add("%" + search + "%");
            params.add("%" + search + "%");
        }

        sql.append(" ORDER BY l.movement_at DESC ");

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> StockLedgerReportResponse.builder()
                .warehouseName(rs.getString("warehouseName"))
                .productCode(rs.getString("productCode"))
                .productName(rs.getString("productName"))
                .description(rs.getString("description"))
                .movementAt(rs.getTimestamp("movementAt").toLocalDateTime())
                .documentNumber(rs.getString("documentNumber"))
                .documentType(rs.getString("documentType"))
                .reference(rs.getString("documentType"))
                .unitName(rs.getString("unitName"))
                .unitPrice(rs.getBigDecimal("unitPrice"))
                .quantityIn(rs.getBigDecimal("quantityIn"))
                .quantityOut(rs.getBigDecimal("quantityOut"))
                .balanceAfter(rs.getBigDecimal("balanceAfter"))
                .build(), params.toArray());
    }

    // 3. Stock Transfer Report
    public List<StockTransferReportResponse> getStockTransferReport(Long warehouseId, LocalDate startDate, LocalDate endDate, String search) {
        StringBuilder sql = new StringBuilder(
                "SELECT " +
                        "st.transfer_date AS documentDate, " +
                        "st.transfer_code AS documentNumber, " +
                        "p.product_code AS itemCode, " +
                        "p.product_name AS itemName, " +
                        "w_from.name AS sourceWarehouse, " +
                        "w_to.name AS destinationWarehouse, " +
                        "u.name AS unitName, " +
                        "stl.quantity AS quantity, " +
                        "stl.unit_cost AS unitPrice, " +
                        "(stl.quantity * stl.unit_cost) AS amount " +
                        "FROM STOCK_TRANSFERS st " +
                        "JOIN STOCK_TRANSFER_LINES stl ON st.id = stl.stock_transfer_id " +
                        "JOIN WAREHOUSES w_from ON st.from_warehouse_id = w_from.id " +
                        "JOIN WAREHOUSES w_to ON st.to_warehouse_id = w_to.id " +
                        "JOIN PRODUCT_VARIANTS pv ON stl.variant_id = pv.id " +
                        "JOIN PRODUCTS p ON pv.product_id = p.id " +
                        "JOIN UNITS u ON p.unit_id = u.id " +
                        "WHERE st.status IN ('APPROVED', 'POSTED') "
        );
        List<Object> params = new ArrayList<>();

        if (warehouseId != null) {
            sql.append(" AND (st.from_warehouse_id = ? OR st.to_warehouse_id = ?) ");
            params.add(warehouseId);
            params.add(warehouseId);
        }
        if (startDate != null) {
            sql.append(" AND st.transfer_date >= ? ");
            params.add(startDate);
        }
        if (endDate != null) {
            sql.append(" AND st.transfer_date <= ? ");
            params.add(endDate);
        }
        if (search != null && !search.trim().isEmpty()) {
            sql.append(" AND (p.product_code LIKE ? OR p.product_name LIKE ? OR st.transfer_code LIKE ?) ");
            params.add("%" + search + "%");
            params.add("%" + search + "%");
            params.add("%" + search + "%");
        }

        sql.append(" ORDER BY st.transfer_date DESC, st.transfer_code DESC ");

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> StockTransferReportResponse.builder()
                .documentDate(rs.getDate("documentDate").toLocalDate())
                .documentNumber(rs.getString("documentNumber"))
                .itemCode(rs.getString("itemCode"))
                .itemName(rs.getString("itemName"))
                .sourceWarehouse(rs.getString("sourceWarehouse"))
                .destinationWarehouse(rs.getString("destinationWarehouse"))
                .unitName(rs.getString("unitName"))
                .quantity(rs.getBigDecimal("quantity"))
                .unitPrice(rs.getBigDecimal("unitPrice"))
                .amount(rs.getBigDecimal("amount"))
                .transactionType("STOCK_TRANSFER")
                .build(), params.toArray());
    }

    // 4. Debt Report
    public List<DebtReportResponse> getDebtReport(LocalDateTime startDate, LocalDateTime endDate, String search) {
        String sql = 
            "SELECT " +
            "pt.code AS customerCode, " +
            "pt.name AS customerName, " +
            "COALESCE(SUM(CASE WHEN pl.created_at < ? THEN pl.amount_debt - pl.amount_receipt ELSE 0 END), 0) AS openingBalance, " +
            "COALESCE(SUM(CASE WHEN pl.created_at >= ? AND pl.created_at <= ? THEN pl.amount_debt ELSE 0 END), 0) AS debitIncrease, " +
            "COALESCE(SUM(CASE WHEN pl.created_at >= ? AND pl.created_at <= ? THEN pl.amount_receipt ELSE 0 END), 0) AS creditDecrease " +
            "FROM PARTNERS pt " +
            "LEFT JOIN PARTNER_LEDGER pl ON pt.id = pl.partner_id " +
            "WHERE pt.is_customer = TRUE ";
            
        List<Object> params = new ArrayList<>();
        params.add(startDate);
        params.add(startDate);
        params.add(endDate);
        params.add(startDate);
        params.add(endDate);

        if (search != null && !search.trim().isEmpty()) {
            sql += " AND (pt.code LIKE ? OR pt.name LIKE ?) ";
            params.add("%" + search + "%");
            params.add("%" + search + "%");
        }

        sql += " GROUP BY pt.id, pt.code, pt.name ORDER BY pt.code";

        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            BigDecimal open = rs.getBigDecimal("openingBalance");
            BigDecimal inc = rs.getBigDecimal("debitIncrease");
            BigDecimal dec = rs.getBigDecimal("creditDecrease");
            BigDecimal close = open.add(inc).subtract(dec);
            String status = close.compareTo(BigDecimal.ZERO) > 0 ? "CO_NO" : "HET_NO";
            
            return DebtReportResponse.builder()
                .customerCode(rs.getString("customerCode"))
                .customerName(rs.getString("customerName"))
                .openingBalance(open)
                .debitIncrease(inc)
                .creditDecrease(dec)
                .closingBalance(close)
                .debtStatus(status)
                .build();
        }, params.toArray());
    }

    // 5. Inventory Summary Report
    public List<InventorySummaryReportResponse> getInventorySummaryReport(Long warehouseId, LocalDateTime startDate, LocalDateTime endDate, String search) {
        StringBuilder sql = new StringBuilder(
            "SELECT " +
            "w.name AS warehouseName, " +
            "p.product_code AS productCode, " +
            "p.product_name AS productName, " +
            "u.name AS unitName, " +
            "COALESCE(SUM(CASE WHEN l.movement_at < ? THEN l.quantity_in - l.quantity_out ELSE 0 END), 0) AS openingQuantity, " +
            "COALESCE(SUM(CASE WHEN l.movement_at < ? THEN (l.quantity_in * l.unit_cost) - (l.quantity_out * l.unit_cost) ELSE 0 END), 0) AS openingValue, " +
            "COALESCE(SUM(CASE WHEN l.movement_at >= ? AND l.movement_at <= ? THEN l.quantity_in ELSE 0 END), 0) AS receiptQuantity, " +
            "COALESCE(SUM(CASE WHEN l.movement_at >= ? AND l.movement_at <= ? THEN l.quantity_in * l.unit_cost ELSE 0 END), 0) AS receiptValue, " +
            "COALESCE(SUM(CASE WHEN l.movement_at >= ? AND l.movement_at <= ? THEN l.quantity_out ELSE 0 END), 0) AS issueQuantity, " +
            "COALESCE(SUM(CASE WHEN l.movement_at >= ? AND l.movement_at <= ? THEN l.quantity_out * l.unit_cost ELSE 0 END), 0) AS issueValue " +
            "FROM PRODUCT_VARIANTS pv " +
            "JOIN PRODUCTS p ON pv.product_id = p.id " +
            "JOIN UNITS u ON p.unit_id = u.id " +
            "JOIN INVENTORY_LEDGER l ON l.variant_id = pv.id " +
            "JOIN WAREHOUSES w ON l.warehouse_id = w.id " +
            "WHERE 1=1 "
        );
        
        List<Object> params = new ArrayList<>();
        params.add(startDate);
        params.add(startDate);
        params.add(startDate);
        params.add(endDate);
        params.add(startDate);
        params.add(endDate);
        params.add(startDate);
        params.add(endDate);
        params.add(startDate);
        params.add(endDate);

        if (warehouseId != null) {
            sql.append(" AND l.warehouse_id = ? ");
            params.add(warehouseId);
        }
        if (search != null && !search.trim().isEmpty()) {
            sql.append(" AND (p.product_code LIKE ? OR p.product_name LIKE ?) ");
            params.add("%" + search + "%");
            params.add("%" + search + "%");
        }

        sql.append(" GROUP BY w.id, w.name, p.product_code, p.product_name, u.name ");
        sql.append(" ORDER BY w.name, p.product_code ");

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> {
            BigDecimal opQ = rs.getBigDecimal("openingQuantity");
            BigDecimal opV = rs.getBigDecimal("openingValue");
            BigDecimal rq = rs.getBigDecimal("receiptQuantity");
            BigDecimal rv = rs.getBigDecimal("receiptValue");
            BigDecimal iq = rs.getBigDecimal("issueQuantity");
            BigDecimal iv = rs.getBigDecimal("issueValue");
            
            return InventorySummaryReportResponse.builder()
                .warehouseName(rs.getString("warehouseName"))
                .productCode(rs.getString("productCode"))
                .productName(rs.getString("productName"))
                .unitName(rs.getString("unitName"))
                .openingQuantity(opQ)
                .openingValue(opV)
                .receiptQuantity(rq)
                .receiptValue(rv)
                .issueQuantity(iq)
                .issueValue(iv)
                .endingQuantity(opQ.add(rq).subtract(iq))
                .endingValue(opV.add(rv).subtract(iv))
                .build();
        }, params.toArray());
    }

    // 6. Dashboard metrics 
    public DashboardResponse getDashboardMetrics() {
        // low stock items count
        String lowStockSql = "SELECT COUNT(DISTINCT pv.id) FROM INVENTORY_BALANCES ib JOIN PRODUCT_VARIANTS pv ON ib.variant_id = pv.id WHERE ib.quantity_on_hand > 0 AND ib.quantity_on_hand <= 5";
        Integer lowStockCount = jdbcTemplate.queryForObject(lowStockSql, Integer.class);

        // out of stock items count
        String outOfStockSql = "SELECT COUNT(DISTINCT pv.id) FROM PRODUCT_VARIANTS pv WHERE pv.active = TRUE AND NOT EXISTS (SELECT 1 FROM INVENTORY_BALANCES ib WHERE ib.variant_id = pv.id AND ib.quantity_on_hand > 0)";
        Integer outOfStockCount = jdbcTemplate.queryForObject(outOfStockSql, Integer.class);

        // total value
        String totalValueSql = "SELECT COALESCE(SUM(quantity_on_hand * average_cost), 0) FROM INVENTORY_BALANCES";
        BigDecimal totalValue = jdbcTemplate.queryForObject(totalValueSql, BigDecimal.class);
        
        return DashboardResponse.builder()
            .lowStockItemsCount(lowStockCount != null ? lowStockCount : 0)
            .outOfStockItemsCount(outOfStockCount != null ? outOfStockCount : 0)
            .inventoryTurnoverRatio(BigDecimal.ZERO) // Simplified for dashboard
            .averageDaysInInventory(BigDecimal.ZERO) // Simplified for dashboard
            .totalInventoryValue(totalValue != null ? totalValue : BigDecimal.ZERO)
            .build();
    }
}
