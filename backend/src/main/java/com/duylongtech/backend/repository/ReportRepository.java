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
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Repository
@RequiredArgsConstructor
public class ReportRepository {
    private final JdbcTemplate jdbcTemplate;

    // 1. Inventory Balance Report
    public List<InventoryBalanceReportResponse> getInventoryBalanceReport(String search, Long warehouseId) {
        StringBuilder sql = new StringBuilder(
                "SELECT " +
                        "pv.sku AS itemCode, " +
                        "pv.sku AS sku, " +
                        "pv.id AS variantId, " +
                        "pv.variant_name AS itemName, " +
                        "u.name AS unitName, " +
                        "w.id AS warehouseId, " +
                        "w.code AS warehouseCode, " +
                        "w.name AS warehouseName, " +
                        "p.track_serial AS trackSerial, " +
                        "SUM(CASE WHEN ( " +
                        "  (COALESCE(p.track_serial, FALSE) = TRUE " +
                        "    AND ib.serial_number_id IS NOT NULL " +
                        "    AND sn.status = 'AVAILABLE' " +
                        "    AND NOT EXISTS ( " +
                        "      SELECT 1 FROM device_component_serials dcs " +
                        "      WHERE dcs.component_variant_id = ib.variant_id " +
                        "        AND LOWER(dcs.component_serial) = LOWER(sn.serial_number) " +
                        "        AND (dcs.status IS NULL OR dcs.status = 'ACTIVE') " +
                        "    ) " +
                        "  ) " +
                        "  OR (COALESCE(p.track_serial, FALSE) = FALSE AND ib.serial_number_id IS NULL) " +
                        ") THEN ib.quantity_on_hand ELSE 0 END) AS totalQuantity, " +
                        "SUM(CASE WHEN ib.serial_number_id IS NULL THEN ib.quantity_reserved ELSE 0 END) AS totalReserved, " +
                        "( " +
                        "  SUM(CASE WHEN ( " +
                        "    (COALESCE(p.track_serial, FALSE) = TRUE " +
                        "      AND ib.serial_number_id IS NOT NULL " +
                        "      AND sn.status = 'AVAILABLE' " +
                        "      AND NOT EXISTS ( " +
                        "        SELECT 1 FROM device_component_serials dcs " +
                        "        WHERE dcs.component_variant_id = ib.variant_id " +
                        "          AND LOWER(dcs.component_serial) = LOWER(sn.serial_number) " +
                        "          AND (dcs.status IS NULL OR dcs.status = 'ACTIVE') " +
                        "      ) " +
                        "    ) " +
                        "    OR (COALESCE(p.track_serial, FALSE) = FALSE AND ib.serial_number_id IS NULL) " +
                        "  ) THEN ib.quantity_on_hand ELSE 0 END) " +
                        "  - " +
                        "  SUM(CASE WHEN ib.serial_number_id IS NULL THEN ib.quantity_reserved ELSE 0 END) " +
                        ") AS availableQuantity, " +
                        "SUM(CASE WHEN ( " +
                        "  (COALESCE(p.track_serial, FALSE) = TRUE " +
                        "    AND ib.serial_number_id IS NOT NULL " +
                        "    AND sn.status = 'AVAILABLE' " +
                        "    AND NOT EXISTS ( " +
                        "      SELECT 1 FROM device_component_serials dcs " +
                        "      WHERE dcs.component_variant_id = ib.variant_id " +
                        "        AND LOWER(dcs.component_serial) = LOWER(sn.serial_number) " +
                        "        AND (dcs.status IS NULL OR dcs.status = 'ACTIVE') " +
                        "    ) " +
                        "  ) " +
                        "  OR (COALESCE(p.track_serial, FALSE) = FALSE AND ib.serial_number_id IS NULL) " +
                        ") THEN ib.quantity_on_hand * ib.average_cost ELSE 0 END) AS totalValue " +
                        "FROM inventory_balances ib " +
                        "JOIN product_variants pv ON ib.variant_id = pv.id " +
                        "JOIN products p ON pv.product_id = p.id " +
                        "JOIN units u ON p.unit_id = u.id " +
                        "JOIN warehouses w ON ib.warehouse_id = w.id " +
                        "LEFT JOIN serial_numbers sn ON ib.serial_number_id = sn.id " +
                        "WHERE ib.stock_status = 'GOOD' " +
                        "AND ( " +
                        "  (COALESCE(p.track_serial, FALSE) = TRUE) " +
                        "  OR (COALESCE(p.track_serial, FALSE) = FALSE AND ib.serial_number_id IS NULL) " +
                        ") "
        );
        List<Object> params = new ArrayList<>();

        if (warehouseId != null) {
            sql.append(" AND ib.warehouse_id = ? ");
            params.add(warehouseId);
        }
        if (search != null && !search.trim().isEmpty()) {
            sql.append(" AND (pv.sku LIKE ? OR pv.variant_name LIKE ?) ");
            params.add("%" + search + "%");
            params.add("%" + search + "%");
        }

        sql.append(" GROUP BY pv.sku, pv.id, pv.variant_name, u.name, w.id, w.code, w.name, p.track_serial ");
        sql.append(" ORDER BY w.code, pv.sku ");

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> InventoryBalanceReportResponse.builder()
                .itemCode(rs.getString("itemCode"))
                .itemName(rs.getString("itemName"))
                .unitName(rs.getString("unitName"))
                .warehouseId(rs.getLong("warehouseId"))
                .warehouseCode(rs.getString("warehouseCode"))
                .warehouseName(rs.getString("warehouseName"))
                .totalQuantity(rs.getBigDecimal("totalQuantity"))
                .totalReserved(rs.getBigDecimal("totalReserved"))
                .availableQuantity(rs.getBigDecimal("availableQuantity"))
                .totalValue(rs.getBigDecimal("totalValue"))
                .variantId(rs.getLong("variantId"))
                .sku(rs.getString("sku"))
                .trackSerial(rs.getBoolean("trackSerial"))
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
                        "doc.id AS documentId, " +
                        "doc.doc_date AS documentDate, " +
                        "doc.doc_code AS documentNumber, " +
                        "doc.doc_type AS documentType, " +
                        "u.name AS unitName, " +
                        "l.unit_cost AS unitPrice, " +
                        "l.quantity_in AS quantityIn, " +
                        "l.quantity_out AS quantityOut, " +
                        "l.balance_after AS balanceAfter " +
                        "FROM inventory_ledger l " +
                        "JOIN warehouses w ON l.warehouse_id = w.id " +
                        "JOIN product_variants pv ON l.variant_id = pv.id " +
                        "JOIN products p ON pv.product_id = p.id " +
                        "JOIN units u ON p.unit_id = u.id " +
                        "JOIN inventory_documents doc ON l.inventory_document_id = doc.id " +
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
                .documentId(rs.getLong("documentId"))
                .documentDate(rs.getDate("documentDate") != null ? rs.getDate("documentDate").toLocalDate() : null)
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
    public List<StockTransferReportResponse> getStockTransferReport(Long warehouseId, LocalDate startDate, LocalDate endDate, String search, String status) {
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
                        "(stl.quantity * stl.unit_cost) AS amount, " +
                        "st.status AS status " +
                        "FROM stock_transfers st " +
                        "JOIN stock_transfer_lines stl ON st.id = stl.stock_transfer_id " +
                        "JOIN warehouses w_from ON st.from_warehouse_id = w_from.id " +
                        "JOIN warehouses w_to ON st.to_warehouse_id = w_to.id " +
                        "JOIN product_variants pv ON stl.variant_id = pv.id " +
                        "JOIN products p ON pv.product_id = p.id " +
                        "JOIN units u ON p.unit_id = u.id " +
                        "WHERE 1=1 "
        );
        List<Object> params = new ArrayList<>();

        if (status != null && !status.trim().isEmpty()) {
            sql.append(" AND st.status = ? ");
            params.add(status);
        } else {
            // Default to not showing DRAFT or CANCELLED unless explicitly requested
            sql.append(" AND st.status IN ('APPROVED', 'POSTED') ");
        }

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
                .status(rs.getString("status"))
                .transactionType("STOCK_TRANSFER")
                .build(), params.toArray());
    }

    // 4. Debt Report
    public List<DebtReportResponse> getDebtReport(LocalDateTime startDate, LocalDateTime endDate, String search, String partnerType) {
        StringBuilder sql = new StringBuilder(
            "SELECT " +
            "pt.code AS partnerCode, " +
            "pt.name AS partnerName, " +
            "pt.is_customer AS isCustomer, " +
            "pt.is_supplier AS isSupplier, " +
            "COALESCE(SUM(CASE WHEN pl.created_at < CAST(? AS DATETIME) THEN pl.amount_debt - pl.amount_receipt ELSE 0 END), 0) AS openingBalance, " +
            "COALESCE(SUM(CASE WHEN pl.created_at >= CAST(? AS DATETIME) AND pl.created_at <= CAST(? AS DATETIME) THEN pl.amount_debt ELSE 0 END), 0) AS debitIncrease, " +
            "COALESCE(SUM(CASE WHEN pl.created_at >= CAST(? AS DATETIME) AND pl.created_at <= CAST(? AS DATETIME) THEN pl.amount_receipt ELSE 0 END), 0) AS creditDecrease " +
            "FROM partners pt " +
            "LEFT JOIN partner_ledger pl ON pt.id = pl.partner_id " +
            "WHERE 1=1 "
        );
            
        List<Object> params = new ArrayList<>();
        params.add(startDate);
        params.add(startDate);
        params.add(endDate);
        params.add(startDate);
        params.add(endDate);

        if (partnerType != null && !partnerType.trim().isEmpty()) {
            if (partnerType.equalsIgnoreCase("CUSTOMER")) {
                sql.append(" AND pt.is_customer = ? ");
                params.add(true);
            } else if (partnerType.equalsIgnoreCase("SUPPLIER")) {
                sql.append(" AND pt.is_supplier = ? ");
                params.add(true);
            }
        } else {
            sql.append(" AND (pt.is_customer = ? OR pt.is_supplier = ?) ");
            params.add(true);
            params.add(true);
        }

        if (search != null && !search.trim().isEmpty()) {
            sql.append(" AND (pt.code LIKE ? OR pt.name LIKE ?) ");
            params.add("%" + search + "%");
            params.add("%" + search + "%");
        }

        sql.append(" GROUP BY pt.id, pt.code, pt.name, pt.is_customer, pt.is_supplier ORDER BY pt.code");

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> {
            BigDecimal open = rs.getBigDecimal("openingBalance");
            BigDecimal inc = rs.getBigDecimal("debitIncrease");
            BigDecimal dec = rs.getBigDecimal("creditDecrease");
            BigDecimal close = open.add(inc).subtract(dec);
            String status = close.compareTo(BigDecimal.ZERO) > 0 ? "CO_NO" : "HET_NO";
            
            boolean isCust = rs.getBoolean("isCustomer");
            boolean isSupp = rs.getBoolean("isSupplier");
            String type = isCust ? "CUSTOMER" : (isSupp ? "SUPPLIER" : "OTHER");
            
            return DebtReportResponse.builder()
                .partnerCode(rs.getString("partnerCode"))
                .partnerName(rs.getString("partnerName"))
                .partnerType(type)
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
        LocalDate targetDate = (startDate != null ? startDate.toLocalDate() : LocalDate.now()).minusDays(1);

        StringBuilder sql = new StringBuilder(
            "SELECT " +
            "w.name AS warehouseName, " +
            "p.product_code AS productCode, " +
            "p.product_name AS productName, " +
            "u.name AS unitName, " +
            "COALESCE(MAX(ids.closing_quantity), COALESCE(SUM(CASE WHEN l.movement_at < CAST(? AS DATETIME) THEN l.quantity_in - l.quantity_out ELSE 0 END), 0)) AS openingQuantity, " +
            "COALESCE(MAX(ids.closing_value), COALESCE(SUM(CASE WHEN l.movement_at < CAST(? AS DATETIME) THEN (l.quantity_in * l.unit_cost) - (l.quantity_out * l.unit_cost) ELSE 0 END), 0)) AS openingValue, " +
            "COALESCE(SUM(CASE WHEN l.movement_at >= CAST(? AS DATETIME) AND l.movement_at <= CAST(? AS DATETIME) THEN l.quantity_in ELSE 0 END), 0) AS receiptQuantity, " +
            "COALESCE(SUM(CASE WHEN l.movement_at >= CAST(? AS DATETIME) AND l.movement_at <= CAST(? AS DATETIME) THEN l.quantity_in * l.unit_cost ELSE 0 END), 0) AS receiptValue, " +
            "COALESCE(SUM(CASE WHEN l.movement_at >= CAST(? AS DATETIME) AND l.movement_at <= CAST(? AS DATETIME) THEN l.quantity_out ELSE 0 END), 0) AS issueQuantity, " +
            "COALESCE(SUM(CASE WHEN l.movement_at >= CAST(? AS DATETIME) AND l.movement_at <= CAST(? AS DATETIME) THEN l.quantity_out * l.unit_cost ELSE 0 END), 0) AS issueValue " +
            "FROM product_variants pv " +
            "JOIN products p ON pv.product_id = p.id " +
            "JOIN units u ON p.unit_id = u.id " +
            "JOIN inventory_ledger l ON l.variant_id = pv.id " +
            "JOIN warehouses w ON l.warehouse_id = w.id " +
            "LEFT JOIN inventory_daily_snapshots ids ON ids.snapshot_date = ? AND ids.warehouse_id = l.warehouse_id AND ids.variant_id = l.variant_id " +
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
        params.add(targetDate);

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
    public DashboardResponse getDashboardMetrics(String inventoryFlowRange, String categoryScope, String financeRange) {
        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        LocalDate endOfMonth = LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());

        BigDecimal standardWarehouseInventoryValue = getStandardWarehouseInventoryValue();
        List<DashboardResponse.FinishedGoodInventoryDto> finishedGoodInventoryItems = getFinishedGoodInventoryItems();
        List<DashboardResponse.OrderSummaryDto> approvedPurchaseOrders = getApprovedPurchaseOrders();
        List<DashboardResponse.OrderSummaryDto> approvedSalesOrders = getApprovedSalesOrders();
        List<DashboardResponse.OrderSummaryDto> backorderedSalesOrders = getBackorderedSalesOrders();
        List<DashboardResponse.ConfiguredLowStockProductDto> configuredLowStockProducts = getConfiguredLowStockProducts();
        List<DashboardResponse.RepairSummaryDto> confirmedWarrantyRepairs = getConfirmedWarrantyRepairs();
        Map<String, Object> importExportMap = getImportExportMetrics(startOfMonth, endOfMonth);
        Map<String, Object> debtMap = getDebtMetrics();

        return DashboardResponse.builder()
                .inventoryTurnoverRatio(BigDecimal.ZERO)
                .averageDaysInInventory(BigDecimal.ZERO)
                .totalInventoryValue(standardWarehouseInventoryValue)
                .standardWarehouseInventoryValue(standardWarehouseInventoryValue)
                .totalImportThisMonth(toBigDecimal(importExportMap.get("totalImport")))
                .totalExportThisMonth(toBigDecimal(importExportMap.get("totalExport")))
                .totalCustomerDebt(toBigDecimal(debtMap.get("totalCustomerDebt")))
                .totalSupplierDebt(toBigDecimal(debtMap.get("totalSupplierDebt")))
                .newWarrantyTickets(getNewWarrantyTickets(startOfMonth, endOfMonth))
                .recentActivities(getRecentActivities())
                .finishedGoodInventoryItems(finishedGoodInventoryItems)
                .approvedPurchaseOrders(approvedPurchaseOrders)
                .approvedSalesOrders(approvedSalesOrders)
                .backorderedSalesOrders(backorderedSalesOrders)
                .configuredLowStockProducts(configuredLowStockProducts)
                .confirmedWarrantyRepairs(confirmedWarrantyRepairs)
                .approvedPurchaseOrdersCount(approvedPurchaseOrders.size())
                .approvedSalesOrdersCount(approvedSalesOrders.size())
                .backorderedSalesOrdersCount(backorderedSalesOrders.size())
                .configuredLowStockProductsCount(getConfiguredLowStockProductsCount())
                .confirmedWarrantyRepairsCount(confirmedWarrantyRepairs.size())
                .inventoryFlow7Days(getInventoryFlowData(inventoryFlowRange))
                .categoryInventoryBreakdown(getCategoryInventoryBreakdown(categoryScope))
                .financeOverview(getFinanceOverview(financeRange))
                .recentTransactions(getRecentTransactions())
                .build();
    }

    private List<DashboardResponse.InventoryFlowDto> getInventoryFlowData(String range) {
        String normalizedRange = range != null ? range.trim().toLowerCase() : "7days";
        LocalDate today = LocalDate.now();
        LocalDate startDate;
        LocalDate endDate;

        switch (normalizedRange) {
            case "thismonth" -> {
                startDate = today.withDayOfMonth(1);
                endDate = today.withDayOfMonth(today.lengthOfMonth());
            }
            case "lastmonth" -> {
                LocalDate lastMonth = today.minusMonths(1);
                startDate = lastMonth.withDayOfMonth(1);
                endDate = lastMonth.withDayOfMonth(lastMonth.lengthOfMonth());
            }
            default -> {
                startDate = today.minusDays(6);
                endDate = today;
                normalizedRange = "7days";
            }
        }
        final String rangeKey = normalizedRange;

        String sql = """
                SELECT
                    idoc.doc_date AS documentDate,
                    COALESCE(SUM(idl.quantity_in), 0) AS totalImportQty,
                    COALESCE(SUM(idl.quantity_out), 0) AS totalExportQty
                FROM inventory_documents idoc
                JOIN inventory_document_lines idl ON idoc.id = idl.inventory_document_id
                WHERE idoc.status = 'POSTED'
                  AND idoc.doc_date >= ?
                  AND idoc.doc_date <= ?
                GROUP BY idoc.doc_date
                """;

        Map<LocalDate, DashboardResponse.InventoryFlowDto> flowMap = new HashMap<>();
        jdbcTemplate.query(sql, rs -> {
            LocalDate date = rs.getDate("documentDate").toLocalDate();
            flowMap.put(date, DashboardResponse.InventoryFlowDto.builder()
                    .label(toInventoryFlowLabel(date, rangeKey))
                    .importQuantity(rs.getBigDecimal("totalImportQty"))
                    .exportQuantity(rs.getBigDecimal("totalExportQty"))
                    .build());
        }, startDate, endDate);

        List<DashboardResponse.InventoryFlowDto> result = new ArrayList<>();
        long days = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) + 1;
        for (int i = 0; i < days; i++) {
            LocalDate date = startDate.plusDays(i);
            DashboardResponse.InventoryFlowDto dto = flowMap.get(date);
            result.add(DashboardResponse.InventoryFlowDto.builder()
                    .label(toInventoryFlowLabel(date, rangeKey))
                    .importQuantity(dto != null ? zeroIfNull(dto.getImportQuantity()) : BigDecimal.ZERO)
                    .exportQuantity(dto != null ? zeroIfNull(dto.getExportQuantity()) : BigDecimal.ZERO)
                    .build());
        }
        return result;
    }

    private List<DashboardResponse.CategoryInventoryDto> getCategoryInventoryBreakdown(String scope) {
        String normalizedScope = scope != null ? scope.trim().toLowerCase() : "all";
        StringBuilder sql = new StringBuilder("""
                SELECT
                    COALESCE(pc.name, 'Khác') AS categoryName,
                    COALESCE(SUM(
                        CASE
                            WHEN (
                                (COALESCE(p.track_serial, FALSE) = TRUE
                                    AND ib.serial_number_id IS NOT NULL
                                    AND sn.status = 'AVAILABLE'
                                    AND NOT EXISTS (
                                        SELECT 1 FROM device_component_serials dcs
                                        WHERE dcs.component_variant_id = ib.variant_id
                                          AND LOWER(dcs.component_serial) = LOWER(sn.serial_number)
                                          AND (dcs.status IS NULL OR dcs.status = 'ACTIVE')
                                    )
                                )
                                OR (COALESCE(p.track_serial, FALSE) = FALSE AND ib.serial_number_id IS NULL)
                            )
                            THEN ib.quantity_on_hand * ib.average_cost
                            ELSE 0
                        END
                    ), 0) AS inventoryValue
                FROM inventory_balances ib
                JOIN product_variants pv ON ib.variant_id = pv.id
                JOIN products p ON pv.product_id = p.id
                JOIN warehouses w ON ib.warehouse_id = w.id
                LEFT JOIN product_categories pc ON p.category_id = pc.id
                LEFT JOIN serial_numbers sn ON ib.serial_number_id = sn.id
                WHERE ib.stock_status = 'GOOD'
                  AND w.type = 'STANDARD'
                """);

        if ("finished".equals(normalizedScope)) {
            sql.append(" AND LOWER(TRIM(p.product_type)) IN ('thành phẩm', 'thanh pham') ");
        } else if ("nonfinished".equals(normalizedScope)) {
            sql.append(" AND LOWER(TRIM(p.product_type)) NOT IN ('thành phẩm', 'thanh pham') ");
        }

        sql.append("""
                GROUP BY COALESCE(pc.name, 'Khác')
                HAVING COALESCE(SUM(
                    CASE
                        WHEN (
                            (COALESCE(p.track_serial, FALSE) = TRUE
                                AND ib.serial_number_id IS NOT NULL
                                AND sn.status = 'AVAILABLE'
                                AND NOT EXISTS (
                                    SELECT 1 FROM device_component_serials dcs
                                    WHERE dcs.component_variant_id = ib.variant_id
                                      AND LOWER(dcs.component_serial) = LOWER(sn.serial_number)
                                      AND (dcs.status IS NULL OR dcs.status = 'ACTIVE')
                                )
                            )
                            OR (COALESCE(p.track_serial, FALSE) = FALSE AND ib.serial_number_id IS NULL)
                        )
                        THEN ib.quantity_on_hand * ib.average_cost
                        ELSE 0
                    END
                ), 0) > 0
                ORDER BY inventoryValue DESC
                """);

        List<DashboardResponse.CategoryInventoryDto> rows = jdbcTemplate.query(sql.toString(), (rs, rowNum) ->
                DashboardResponse.CategoryInventoryDto.builder()
                        .categoryName(rs.getString("categoryName"))
                        .inventoryValue(rs.getBigDecimal("inventoryValue"))
                        .percentage(BigDecimal.ZERO)
                        .build()
        );

        BigDecimal total = rows.stream()
                .map(DashboardResponse.CategoryInventoryDto::getInventoryValue)
                .map(this::zeroIfNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return rows.stream()
                .map(item -> DashboardResponse.CategoryInventoryDto.builder()
                        .categoryName(item.getCategoryName())
                        .inventoryValue(zeroIfNull(item.getInventoryValue()))
                        .percentage(total.compareTo(BigDecimal.ZERO) > 0
                                ? zeroIfNull(item.getInventoryValue())
                                .multiply(BigDecimal.valueOf(100))
                                .divide(total, 2, java.math.RoundingMode.HALF_UP)
                                : BigDecimal.ZERO)
                        .build())
                .toList();
    }

    private List<DashboardResponse.FinanceOverviewDto> getFinanceOverview(String financeRange) {
        int currentYear = LocalDate.now().getYear();
        String normalizedRange = financeRange != null ? financeRange.trim().toLowerCase() : String.valueOf(currentYear);
        int year = currentYear;
        boolean quarterOnly = false;

        if ("quarter".equals(normalizedRange)) {
            quarterOnly = true;
        } else {
            try {
                year = Integer.parseInt(normalizedRange);
            } catch (NumberFormatException ignored) {
                year = currentYear;
            }
        }

        String cashflowSql = """
                SELECT
                    MONTH(created_at) AS monthNumber,
                    COALESCE(SUM(CASE WHEN type = 'RECEIPT' THEN amount ELSE 0 END), 0) AS receipts,
                    COALESCE(SUM(CASE WHEN type = 'VOUCHER' THEN amount ELSE 0 END), 0) AS vouchers
                FROM payment_transactions
                WHERE status = 'POSTED'
                  AND YEAR(created_at) = ?
                GROUP BY MONTH(created_at)
                """;

        Map<Integer, DashboardResponse.FinanceOverviewDto> cashflowMap = new HashMap<>();
        jdbcTemplate.query(cashflowSql, rs -> {
            int monthNumber = rs.getInt("monthNumber");
            cashflowMap.put(monthNumber, DashboardResponse.FinanceOverviewDto.builder()
                    .label("Tháng " + monthNumber)
                    .receipts(rs.getBigDecimal("receipts"))
                    .vouchers(rs.getBigDecimal("vouchers"))
                    .closingDebt(BigDecimal.ZERO)
                    .build());
        }, year);

        List<DashboardResponse.FinanceOverviewDto> result = new ArrayList<>();
        int startMonth = 1;
        int endMonth = 12;
        if (quarterOnly) {
            int currentMonth = LocalDate.now().getMonthValue();
            int quarterStartMonth = ((currentMonth - 1) / 3) * 3 + 1;
            startMonth = quarterStartMonth;
            endMonth = quarterStartMonth + 2;
        }

        for (int month = startMonth; month <= endMonth; month++) {
            DashboardResponse.FinanceOverviewDto monthData = cashflowMap.get(month);
            result.add(DashboardResponse.FinanceOverviewDto.builder()
                    .label("Tháng " + month)
                    .receipts(monthData != null ? zeroIfNull(monthData.getReceipts()) : BigDecimal.ZERO)
                    .vouchers(monthData != null ? zeroIfNull(monthData.getVouchers()) : BigDecimal.ZERO)
                    .closingDebt(getCustomerClosingDebtForMonth(YearMonth.of(year, month).atEndOfMonth().plusDays(1).atStartOfDay()))
                    .build());
        }
        return result;
    }

    private BigDecimal getCustomerClosingDebtForMonth(LocalDateTime monthEndExclusive) {
        String sql = """
                SELECT COALESCE(SUM(latest_rows.balance_after), 0) AS totalDebt
                FROM (
                    SELECT
                        pl.partner_id,
                        pl.balance_after,
                        ROW_NUMBER() OVER (PARTITION BY pl.partner_id ORDER BY pl.created_at DESC, pl.id DESC) AS rn
                    FROM partner_ledger pl
                    JOIN partners pt ON pl.partner_id = pt.id
                    WHERE pt.is_customer = 1
                      AND pl.created_at < ?
                ) latest_rows
                WHERE latest_rows.rn = 1
                  AND latest_rows.balance_after > 0
                """;
        BigDecimal result = jdbcTemplate.queryForObject(sql, BigDecimal.class, monthEndExclusive);
        return result != null ? result : BigDecimal.ZERO;
    }

    private List<DashboardResponse.RecentTransactionDto> getRecentTransactions() {
        String sql = """
                WITH recent_items AS (
                    SELECT
                        'PURCHASE_ORDER' AS entityType,
                        po.id AS entityId,
                        po.po_code AS code,
                        'Đơn mua' AS transactionType,
                        pt.name AS partnerName,
                        po.status AS status,
                        po.created_at AS createdAt
                    FROM purchase_orders po
                    LEFT JOIN partners pt ON po.partner_id = pt.id

                    UNION ALL

                    SELECT
                        'SALES_ORDER' AS entityType,
                        so.id AS entityId,
                        so.so_code AS code,
                        'Đơn bán' AS transactionType,
                        pt.name AS partnerName,
                        so.status AS status,
                        so.created_at AS createdAt
                    FROM sales_orders so
                    LEFT JOIN partners pt ON so.partner_id = pt.id

                    UNION ALL

                    SELECT
                        'IMPORT_DOCUMENT' AS entityType,
                        doc.id AS entityId,
                        doc.doc_code AS code,
                        CASE
                            WHEN doc.issue_purpose = 'RETURN' THEN 'Nhập hàng trả lại'
                            WHEN doc.issue_purpose = 'SCRAP' THEN 'Nhập phế liệu'
                            WHEN doc.issue_purpose = 'PRODUCTION' THEN 'Nhập kho sản xuất'
                            WHEN doc.issue_purpose = 'TRANSFER_IMPORT' THEN 'Nhập chuyển kho'
                            ELSE 'Phiếu nhập kho'
                        END AS transactionType,
                        COALESCE(pt.name, w.name, doc.recipient_name, 'Nội bộ') AS partnerName,
                        doc.status AS status,
                        doc.created_at AS createdAt
                    FROM inventory_documents doc
                    LEFT JOIN partners pt ON doc.partner_id = pt.id
                    LEFT JOIN warehouses w ON doc.warehouse_id = w.id
                    WHERE doc.doc_type LIKE 'IN_%'

                    UNION ALL

                    SELECT
                        'EXPORT_DOCUMENT' AS entityType,
                        doc.id AS entityId,
                        doc.doc_code AS code,
                        CASE
                            WHEN doc.issue_purpose = 'ASSEMBLY' THEN 'Xuất lắp ráp / tháo dỡ'
                            WHEN doc.issue_purpose = 'REPAIR' THEN 'Xuất sửa chữa'
                            WHEN doc.issue_purpose = 'TRANSFER_EXPORT' THEN 'Xuất chuyển kho'
                            WHEN doc.issue_purpose = 'USAGE' THEN 'Xuất sử dụng nội bộ'
                            WHEN doc.issue_purpose = 'INVENTORY_ADJUSTMENT' THEN 'Xuất điều chỉnh kiểm kê'
                            ELSE 'Phiếu xuất kho'
                        END AS transactionType,
                        COALESCE(pt.name, w.name, doc.recipient_name, 'Nội bộ') AS partnerName,
                        doc.status AS status,
                        doc.created_at AS createdAt
                    FROM inventory_documents doc
                    LEFT JOIN partners pt ON doc.partner_id = pt.id
                    LEFT JOIN warehouses w ON doc.warehouse_id = w.id
                    WHERE doc.doc_type LIKE 'EX_%'

                    UNION ALL

                    SELECT
                        CASE
                            WHEN ao.order_type = 'DISASSEMBLY' THEN 'DISASSEMBLY_ORDER'
                            ELSE 'ASSEMBLY_ORDER'
                        END AS entityType,
                        ao.id AS entityId,
                        ao.order_code AS code,
                        CASE
                            WHEN ao.order_type = 'DISASSEMBLY' THEN 'Lệnh tháo dỡ'
                            ELSE 'Lệnh lắp ráp'
                        END AS transactionType,
                        w.name AS partnerName,
                        ao.status AS status,
                        ao.created_at AS createdAt
                    FROM assembly_orders ao
                    LEFT JOIN warehouses w ON ao.warehouse_id = w.id

                    UNION ALL

                    SELECT
                        CASE
                            WHEN COALESCE(r.under_warranty, FALSE) = TRUE OR r.warranty_id IS NOT NULL
                                THEN 'WARRANTY_REPAIR'
                            ELSE 'REPAIR'
                        END AS entityType,
                        r.id AS entityId,
                        r.repair_code AS code,
                        CASE
                            WHEN COALESCE(r.under_warranty, FALSE) = TRUE OR r.warranty_id IS NOT NULL
                                THEN 'Sửa chữa bảo hành'
                            ELSE 'Sửa chữa'
                        END AS transactionType,
                        pt.name AS partnerName,
                        r.repair_status AS status,
                        r.created_at AS createdAt
                    FROM repairs r
                    LEFT JOIN partners pt ON r.partner_id = pt.id
                ),
                ranked_items AS (
                    SELECT
                        recent_items.*,
                        ROW_NUMBER() OVER (
                            PARTITION BY recent_items.entityType
                            ORDER BY recent_items.createdAt DESC, recent_items.entityId DESC
                        ) AS row_num
                    FROM recent_items
                )
                SELECT *
                FROM ranked_items
                WHERE row_num <= 2
                ORDER BY createdAt DESC, entityId DESC
                LIMIT 12
                """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> DashboardResponse.RecentTransactionDto.builder()
                .entityType(rs.getString("entityType"))
                .entityId(rs.getLong("entityId"))
                .code(rs.getString("code"))
                .transactionType(rs.getString("transactionType"))
                .partnerName(rs.getString("partnerName"))
                .status(rs.getString("status"))
                .createdAt(rs.getTimestamp("createdAt") != null ? rs.getTimestamp("createdAt").toLocalDateTime() : null)
                .build());
    }

    private BigDecimal getStandardWarehouseInventoryValue() {
        String sql = """
                SELECT COALESCE(SUM(stock_rows.total_value), 0) AS totalInventoryValue
                FROM (
                    SELECT
                        ib.id,
                        CASE
                            WHEN (
                                (COALESCE(p.track_serial, FALSE) = TRUE
                                    AND ib.serial_number_id IS NOT NULL
                                    AND sn.status = 'AVAILABLE'
                                    AND NOT EXISTS (
                                        SELECT 1 FROM device_component_serials dcs
                                        WHERE dcs.component_variant_id = ib.variant_id
                                          AND LOWER(dcs.component_serial) = LOWER(sn.serial_number)
                                          AND (dcs.status IS NULL OR dcs.status = 'ACTIVE')
                                    )
                                )
                                OR (COALESCE(p.track_serial, FALSE) = FALSE AND ib.serial_number_id IS NULL)
                            )
                            THEN ib.quantity_on_hand * ib.average_cost
                            ELSE 0
                        END AS total_value
                    FROM inventory_balances ib
                    JOIN product_variants pv ON ib.variant_id = pv.id
                    JOIN products p ON pv.product_id = p.id
                    JOIN warehouses w ON ib.warehouse_id = w.id
                    LEFT JOIN serial_numbers sn ON ib.serial_number_id = sn.id
                    WHERE ib.stock_status = 'GOOD'
                      AND w.type = 'STANDARD'
                ) stock_rows
                """;
        return jdbcTemplate.queryForObject(sql, BigDecimal.class);
    }

    private List<DashboardResponse.FinishedGoodInventoryDto> getFinishedGoodInventoryItems() {
        Set<String> standardWarehouseCodes = new HashSet<>(jdbcTemplate.query(
                "SELECT code FROM warehouses WHERE type = 'STANDARD'",
                (rs, rowNum) -> rs.getString("code")
        ));

        Map<Long, DashboardResponse.FinishedGoodInventoryDto> finishedGoodMeta = new HashMap<>();
        String metaSql = """
                SELECT
                    pv.id AS variantId,
                    p.product_code AS productCode,
                    p.product_name AS productName,
                    pv.sku AS sku,
                    pv.variant_name AS variantName,
                    u.name AS unitName
                FROM product_variants pv
                JOIN products p ON pv.product_id = p.id
                LEFT JOIN units u ON p.unit_id = u.id
                WHERE LOWER(TRIM(p.product_type)) IN ('thành phẩm', 'thanh pham')
                """;
        jdbcTemplate.query(metaSql, rs -> {
            long variantId = rs.getLong("variantId");
            finishedGoodMeta.put(variantId, DashboardResponse.FinishedGoodInventoryDto.builder()
                    .variantId(variantId)
                    .productCode(rs.getString("productCode"))
                    .productName(rs.getString("productName"))
                    .sku(rs.getString("sku"))
                    .variantName(rs.getString("variantName"))
                    .unitName(rs.getString("unitName"))
                    .quantity(BigDecimal.ZERO)
                    .inventoryValue(BigDecimal.ZERO)
                    .build());
        });

        Map<Long, DashboardResponse.FinishedGoodInventoryDto> aggregated = new HashMap<>();
        for (InventoryBalanceReportResponse item : getInventoryBalanceReport(null, null)) {
            if (!standardWarehouseCodes.contains(item.getWarehouseCode())) {
                continue;
            }
            if (item.getVariantId() == null || !finishedGoodMeta.containsKey(item.getVariantId())) {
                continue;
            }

            DashboardResponse.FinishedGoodInventoryDto seed = finishedGoodMeta.get(item.getVariantId());
            DashboardResponse.FinishedGoodInventoryDto current = aggregated.getOrDefault(item.getVariantId(),
                    DashboardResponse.FinishedGoodInventoryDto.builder()
                            .variantId(seed.getVariantId())
                            .productCode(seed.getProductCode())
                            .productName(seed.getProductName())
                            .sku(seed.getSku())
                            .variantName(seed.getVariantName())
                            .unitName(seed.getUnitName())
                            .quantity(BigDecimal.ZERO)
                            .inventoryValue(BigDecimal.ZERO)
                            .build());

            current.setQuantity(current.getQuantity().add(zeroIfNull(item.getTotalQuantity())));
            current.setInventoryValue(current.getInventoryValue().add(zeroIfNull(item.getTotalValue())));
            aggregated.put(item.getVariantId(), current);
        }

        return aggregated.values().stream()
                .filter(item -> item.getQuantity().compareTo(BigDecimal.ZERO) > 0)
                .sorted(Comparator
                        .comparing(DashboardResponse.FinishedGoodInventoryDto::getQuantity, Comparator.reverseOrder())
                        .thenComparing(DashboardResponse.FinishedGoodInventoryDto::getInventoryValue, Comparator.reverseOrder()))
                .toList();
    }

    private List<DashboardResponse.OrderSummaryDto> getApprovedPurchaseOrders() {
        String sql = """
                SELECT
                    po.id,
                    po.po_code AS code,
                    po.po_date AS documentDate,
                    pt.name AS partnerName,
                    po.total_amount AS totalAmount,
                    po.status
                FROM purchase_orders po
                LEFT JOIN partners pt ON po.partner_id = pt.id
                WHERE po.status = 'APPROVED'
                ORDER BY po.po_date DESC, po.id DESC
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> DashboardResponse.OrderSummaryDto.builder()
                .id(rs.getLong("id"))
                .code(rs.getString("code"))
                .documentDate(rs.getDate("documentDate") != null ? rs.getDate("documentDate").toLocalDate() : null)
                .partnerName(rs.getString("partnerName"))
                .totalAmount(rs.getBigDecimal("totalAmount"))
                .status(rs.getString("status"))
                .build());
    }

    private List<DashboardResponse.OrderSummaryDto> getApprovedSalesOrders() {
        String sql = """
                SELECT
                    so.id,
                    so.so_code AS code,
                    so.so_date AS documentDate,
                    pt.name AS partnerName,
                    w.name AS warehouseName,
                    so.total_amount AS totalAmount,
                    so.status
                FROM sales_orders so
                LEFT JOIN partners pt ON so.partner_id = pt.id
                LEFT JOIN warehouses w ON so.warehouse_id = w.id
                WHERE so.status = 'APPROVED'
                ORDER BY so.so_date DESC, so.id DESC
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> DashboardResponse.OrderSummaryDto.builder()
                .id(rs.getLong("id"))
                .code(rs.getString("code"))
                .documentDate(rs.getDate("documentDate") != null ? rs.getDate("documentDate").toLocalDate() : null)
                .partnerName(rs.getString("partnerName"))
                .warehouseName(rs.getString("warehouseName"))
                .totalAmount(rs.getBigDecimal("totalAmount"))
                .status(rs.getString("status"))
                .build());
    }

    private List<DashboardResponse.OrderSummaryDto> getBackorderedSalesOrders() {
        String sql = """
                SELECT DISTINCT
                    so.id,
                    so.so_code AS code,
                    so.so_date AS documentDate,
                    pt.name AS partnerName,
                    w.name AS warehouseName,
                    so.total_amount AS totalAmount,
                    so.status
                FROM sales_orders so
                JOIN stock_reservations sr ON so.id = sr.sales_order_id
                LEFT JOIN partners pt ON so.partner_id = pt.id
                LEFT JOIN warehouses w ON so.warehouse_id = w.id
                WHERE so.status = 'APPROVED' AND sr.status = 'BACKORDERED'
                ORDER BY so.so_date DESC, so.id DESC
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> DashboardResponse.OrderSummaryDto.builder()
                .id(rs.getLong("id"))
                .code(rs.getString("code"))
                .documentDate(rs.getDate("documentDate") != null ? rs.getDate("documentDate").toLocalDate() : null)
                .partnerName(rs.getString("partnerName"))
                .warehouseName(rs.getString("warehouseName"))
                .totalAmount(rs.getBigDecimal("totalAmount"))
                .status(rs.getString("status"))
                .build());
    }


    private int getConfiguredLowStockProductsCount() {
        String sql = """
                SELECT COUNT(1)
                FROM products p
                WHERE p.active = TRUE
                  AND COALESCE(p.min_stock_qty, 0) > 0
                  AND LOWER(TRIM(p.product_type)) NOT IN ('dịch vụ', 'dich vu', 'service')
                """;
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class);
        return count != null ? count : 0;
    }

    private List<DashboardResponse.ConfiguredLowStockProductDto> getConfiguredLowStockProducts() {
        String sql = """
                SELECT
                    p.id AS productId,
                    p.product_code AS productCode,
                    p.product_name AS productName,
                    p.product_type AS productType,
                    u.name AS unitName,
                    COALESCE(p.min_stock_qty, 0) AS minStockQty,
                    COALESCE(SUM(CASE WHEN ib.serial_number_id IS NULL THEN ib.quantity_on_hand ELSE 0 END), 0) AS stockQty
                FROM products p
                LEFT JOIN units u ON p.unit_id = u.id
                LEFT JOIN product_variants pv
                    ON pv.product_id = p.id
                   AND pv.active = TRUE
                LEFT JOIN inventory_balances ib
                    ON ib.variant_id = pv.id
                WHERE p.active = TRUE
                  AND COALESCE(p.min_stock_qty, 0) > 0
                  AND LOWER(TRIM(p.product_type)) NOT IN ('dịch vụ', 'dich vu', 'service')
                GROUP BY p.id, p.product_code, p.product_name, p.product_type, u.name, p.min_stock_qty
                HAVING COALESCE(SUM(CASE WHEN ib.serial_number_id IS NULL THEN ib.quantity_on_hand ELSE 0 END), 0) <= COALESCE(p.min_stock_qty, 0)
                ORDER BY stockQty ASC, p.product_name ASC
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> DashboardResponse.ConfiguredLowStockProductDto.builder()
                .productId(rs.getLong("productId"))
                .productCode(rs.getString("productCode"))
                .productName(rs.getString("productName"))
                .productType(rs.getString("productType"))
                .unitName(rs.getString("unitName"))
                .stockQty(rs.getBigDecimal("stockQty"))
                .minStockQty(rs.getBigDecimal("minStockQty"))
                .build());
    }

    private List<DashboardResponse.RepairSummaryDto> getConfirmedWarrantyRepairs() {
        String sql = """
                SELECT
                    r.id,
                    r.repair_code AS repairCode,
                    r.received_date AS receivedDate,
                    pt.name AS partnerName,
                    p.product_name AS productName,
                    r.repair_status AS repairStatus,
                    COALESCE(r.under_warranty, FALSE) AS underWarranty
                FROM repairs r
                LEFT JOIN partners pt ON r.partner_id = pt.id
                LEFT JOIN products p ON r.product_id = p.id
                WHERE r.repair_status = 'CONFIRMED'
                  AND (COALESCE(r.under_warranty, FALSE) = TRUE OR r.warranty_id IS NOT NULL)
                ORDER BY r.received_date DESC, r.id DESC
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> DashboardResponse.RepairSummaryDto.builder()
                .id(rs.getLong("id"))
                .repairCode(rs.getString("repairCode"))
                .receivedDate(rs.getDate("receivedDate") != null ? rs.getDate("receivedDate").toLocalDate() : null)
                .partnerName(rs.getString("partnerName"))
                .productName(rs.getString("productName"))
                .repairStatus(rs.getString("repairStatus"))
                .underWarranty(rs.getBoolean("underWarranty"))
                .build());
    }

    private Map<String, Object> getImportExportMetrics(LocalDate startOfMonth, LocalDate endOfMonth) {
        String sql = """
                SELECT
                    COALESCE(SUM(CASE WHEN idoc.doc_type = 'IN_PO' THEN idl.quantity_in * idl.unit_cost ELSE 0 END), 0) AS totalImport,
                    COALESCE(SUM(CASE WHEN idoc.doc_type = 'EX_SO' THEN idl.quantity_out * idl.unit_cost ELSE 0 END), 0) AS totalExport
                FROM inventory_documents idoc
                JOIN inventory_document_lines idl ON idoc.id = idl.inventory_document_id
                WHERE idoc.status = 'POSTED'
                  AND idoc.doc_date >= ?
                  AND idoc.doc_date <= ?
                """;
        return jdbcTemplate.queryForMap(sql, startOfMonth, endOfMonth);
    }

    private Map<String, Object> getDebtMetrics() {
        try {
            String sql = """
                    SELECT
                        COALESCE(SUM(CASE WHEN pt.is_customer = 1 AND pl.balance_after > 0 THEN pl.balance_after ELSE 0 END), 0) AS totalCustomerDebt,
                        COALESCE(SUM(CASE WHEN pt.is_supplier = 1 AND pl.balance_after > 0 THEN pl.balance_after ELSE 0 END), 0) AS totalSupplierDebt
                    FROM partner_ledger pl
                    INNER JOIN partners pt ON pl.partner_id = pt.id
                    """;
            return jdbcTemplate.queryForMap(sql);
        } catch (Exception primaryError) {
            try {
                String fallbackSql = """
                        SELECT
                            COALESCE((SELECT SUM(amount) FROM payment_transactions WHERE status = 'POSTED' AND type = 'RECEIPT'), 0) AS totalCustomerDebt,
                            COALESCE((SELECT SUM(amount) FROM payment_transactions WHERE status = 'POSTED' AND type = 'VOUCHER'), 0) AS totalSupplierDebt
                        """;
                return jdbcTemplate.queryForMap(fallbackSql);
            } catch (Exception ignored) {
                Map<String, Object> zeros = new HashMap<>();
                zeros.put("totalCustomerDebt", BigDecimal.ZERO);
                zeros.put("totalSupplierDebt", BigDecimal.ZERO);
                return zeros;
            }
        }
    }

    private Integer getNewWarrantyTickets(LocalDate startOfMonth, LocalDate endOfMonth) {
        String sql = "SELECT COUNT(id) FROM repairs WHERE received_date >= ? AND received_date <= ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, startOfMonth, endOfMonth);
        return count != null ? count : 0;
    }

    private List<DashboardResponse.RecentActivityDto> getRecentActivities() {
        String sql = """
                SELECT action, description, u.username AS username, a.created_at AS timestamp
                FROM audit_logs a
                LEFT JOIN users u ON a.user_id = u.id
                ORDER BY a.created_at DESC
                LIMIT 5
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> DashboardResponse.RecentActivityDto.builder()
                .action(rs.getString("action"))
                .description(rs.getString("description"))
                .user(rs.getString("username"))
                .timestamp(rs.getTimestamp("timestamp").toLocalDateTime())
                .build());
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bigDecimal) {
            return bigDecimal;
        }
        return new BigDecimal(value.toString());
    }

    private String toVietnameseWeekday(LocalDate date) {
        return switch (date.getDayOfWeek()) {
            case MONDAY -> "T2";
            case TUESDAY -> "T3";
            case WEDNESDAY -> "T4";
            case THURSDAY -> "T5";
            case FRIDAY -> "T6";
            case SATURDAY -> "T7";
            case SUNDAY -> "CN";
        };
    }

    private String toInventoryFlowLabel(LocalDate date, String range) {
        if ("7days".equals(range)) {
            return toVietnameseWeekday(date);
        }
        return String.format("%02d/%02d", date.getDayOfMonth(), date.getMonthValue());
    }
}
