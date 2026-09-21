package com.duylongtech.backend.feature.report;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
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
                        "CONCAT(p.product_name, CASE WHEN pv.variant_name IS NULL OR pv.variant_name = '' THEN '' ELSE CONCAT(' - ', pv.variant_name) END) AS itemName, " +
                        "u.name AS unitName, " +
                        "w.id AS warehouseId, " +
                        "w.code AS warehouseCode, " +
                        "w.name AS warehouseName, " +
                        "(pv.tracking_mode IN ('SERIAL', 'SERIAL_LOT')) AS trackSerial, " +
                        "SUM(CASE WHEN ( " +
                        "  (pv.tracking_mode IN ('SERIAL', 'SERIAL_LOT') " +
                        "    AND ib.serial_number_id IS NOT NULL " +
                        "    AND sn.status = 'AVAILABLE' " +
                        "    AND NOT EXISTS ( " +
                        "      SELECT 1 FROM device_component_serials dcs " +
                        "      WHERE dcs.component_variant_id = ib.variant_id " +
                        "        AND LOWER(dcs.component_serial) = LOWER(sn.serial_number) " +
                        "        AND (dcs.status IS NULL OR dcs.status = 'ACTIVE') " +
                        "    ) " +
                        "  ) " +
                        "  OR (pv.tracking_mode NOT IN ('SERIAL', 'SERIAL_LOT') AND ib.serial_number_id IS NULL) " +
                        ") THEN ib.quantity_on_hand ELSE 0 END) AS totalQuantity, " +
                        "SUM(CASE WHEN ib.serial_number_id IS NULL THEN ib.quantity_reserved ELSE 0 END) AS totalReserved, " +
                        "( " +
                        "  SUM(CASE WHEN ( " +
                        "    (pv.tracking_mode IN ('SERIAL', 'SERIAL_LOT') " +
                        "      AND ib.serial_number_id IS NOT NULL " +
                        "      AND sn.status = 'AVAILABLE' " +
                        "      AND NOT EXISTS ( " +
                        "        SELECT 1 FROM device_component_serials dcs " +
                        "        WHERE dcs.component_variant_id = ib.variant_id " +
                        "          AND LOWER(dcs.component_serial) = LOWER(sn.serial_number) " +
                        "          AND (dcs.status IS NULL OR dcs.status = 'ACTIVE') " +
                        "      ) " +
                        "    ) " +
                        "    OR (pv.tracking_mode NOT IN ('SERIAL', 'SERIAL_LOT') AND ib.serial_number_id IS NULL) " +
                        "  ) THEN ib.quantity_on_hand ELSE 0 END) " +
                        "  - " +
                        "  SUM(CASE WHEN ib.serial_number_id IS NULL THEN ib.quantity_reserved ELSE 0 END) " +
                        ") AS availableQuantity, " +
                        "COALESCE(MAX(fifo.total_value), 0) AS totalValue " +
                        "FROM inventory_balances ib " +
                        "JOIN product_variants pv ON ib.variant_id = pv.id " +
                        "JOIN products p ON pv.product_id = p.id " +
                        "JOIN units u ON p.unit_id = u.id " +
                        "JOIN warehouses w ON ib.warehouse_id = w.id " +
                        "LEFT JOIN serial_numbers sn ON ib.serial_number_id = sn.id " +
                        "LEFT JOIN (SELECT warehouse_id, variant_id, SUM(quantity_layered * unit_cost) AS total_value " +
                        "           FROM inventory_cost_layers GROUP BY warehouse_id, variant_id) fifo " +
                        "  ON fifo.warehouse_id = ib.warehouse_id AND fifo.variant_id = ib.variant_id " +
                        "WHERE ib.stock_status = 'GOOD' " +
                        "AND ( " +
                        "  (pv.tracking_mode IN ('SERIAL', 'SERIAL_LOT')) " +
                        "  OR (pv.tracking_mode NOT IN ('SERIAL', 'SERIAL_LOT') AND ib.serial_number_id IS NULL) " +
                        ") "
        );
        List<Object> params = new ArrayList<>();

        if (warehouseId != null) {
            sql.append(" AND ib.warehouse_id = ? ");
            params.add(warehouseId);
        }
        if (search != null && !search.trim().isEmpty()) {
            sql.append(" AND (pv.sku LIKE ? OR pv.variant_name LIKE ? OR p.product_code LIKE ? OR p.product_name LIKE ?) ");
            params.add("%" + search + "%");
            params.add("%" + search + "%");
            params.add("%" + search + "%");
            params.add("%" + search + "%");
        }

        sql.append(" GROUP BY pv.sku, pv.id, pv.variant_name, u.name, w.id, w.code, w.name, pv.tracking_mode ");
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
                        "l.id AS ledgerId, " +
                        "w.name AS warehouseName, " +
                        "pv.sku AS productCode, " +
                        "CONCAT(p.product_name, CASE WHEN pv.variant_name IS NULL OR pv.variant_name = '' THEN '' ELSE CONCAT(' - ', pv.variant_name) END) AS productName, " +
                        "doc.note AS description, " +
                        "l.movement_at AS movementAt, " +
                        "doc.id AS documentId, " +
                        "doc.doc_date AS documentDate, " +
                        "doc.doc_code AS documentNumber, " +
                        "l.movement_type AS movementType, " +
                        "CASE " +
                        "  WHEN doc.doc_type = 'EX_SO' AND doc.issue_purpose = 'ASSEMBLY' THEN 'EX_BUILD' " +
                        "  WHEN doc.doc_type = 'EX_SO' AND doc.issue_purpose = 'REPAIR' THEN 'EX_REPAIR' " +
                        "  WHEN doc.doc_type = 'EX_SO' AND doc.issue_purpose = 'TRANSFER_EXPORT' THEN 'EX_TRF' " +
                        "  WHEN doc.doc_type = 'EX_SO' AND doc.issue_purpose = 'INVENTORY_ADJUSTMENT' THEN 'EX_ADJ' " +
                        "  WHEN doc.doc_type = 'EX_SO' AND doc.issue_purpose = 'RETURN' THEN 'EX_RET' " +
                        "  WHEN doc.doc_type = 'IN_PO' AND doc.issue_purpose = 'ASSEMBLY' THEN 'IN_BUILD' " +
                        "  WHEN doc.doc_type = 'IN_PO' AND doc.issue_purpose = 'REPAIR' THEN 'IN_REPAIR' " +
                        "  WHEN doc.doc_type = 'IN_PO' AND doc.issue_purpose = 'SCRAP' AND doc.reference_type = 'REPAIR' THEN 'IN_REPAIR' " +
                        "  WHEN doc.doc_type = 'IN_PO' AND doc.issue_purpose = 'TRANSFER_IMPORT' THEN 'IN_TRF' " +
                        "  WHEN doc.doc_type = 'IN_PO' AND doc.issue_purpose = 'INVENTORY_ADJUSTMENT' THEN 'IN_ADJ' " +
                        "  WHEN doc.doc_type = 'IN_PO' AND doc.issue_purpose = 'RETURN' THEN 'IN_RET' " +
                        "  ELSE doc.doc_type " +
                        "END AS documentType, " +
                        "u.name AS unitName, " +
                        "l.unit_cost AS unitPrice, " +
                        "l.quantity_in AS quantityIn, " +
                        "l.quantity_in * l.unit_cost AS amountIn, " +
                        "l.quantity_out AS quantityOut, " +
                        "l.quantity_out * l.unit_cost AS amountOut, " +
                        "l.balance_after - l.quantity_in + l.quantity_out AS balanceBefore, " +
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
            sql.append(" AND l.movement_at < ? ");
            params.add(endDate);
        }
        if (search != null && !search.trim().isEmpty()) {
            sql.append(" AND (pv.sku LIKE ? OR pv.variant_name LIKE ? OR p.product_code LIKE ? OR p.product_name LIKE ? OR doc.doc_code LIKE ?) ");
            params.add("%" + search + "%");
            params.add("%" + search + "%");
            params.add("%" + search + "%");
            params.add("%" + search + "%");
            params.add("%" + search + "%");
        }

        sql.append(" ORDER BY w.code, pv.sku, l.movement_at ASC, l.id ASC ");

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> StockLedgerReportResponse.builder()
                .ledgerId(rs.getLong("ledgerId"))
                .warehouseName(rs.getString("warehouseName"))
                .productCode(rs.getString("productCode"))
                .productName(rs.getString("productName"))
                .description(rs.getString("description"))
                .movementAt(rs.getTimestamp("movementAt").toLocalDateTime())
                .documentId(rs.getLong("documentId"))
                .documentDate(rs.getDate("documentDate") != null ? rs.getDate("documentDate").toLocalDate() : null)
                .documentNumber(rs.getString("documentNumber"))
                .documentType(rs.getString("documentType"))
                .movementType(rs.getString("movementType"))
                .reference(rs.getString("documentType"))
                .unitName(rs.getString("unitName"))
                .unitPrice(rs.getBigDecimal("unitPrice"))
                .quantityIn(rs.getBigDecimal("quantityIn"))
                .amountIn(rs.getBigDecimal("amountIn"))
                .quantityOut(rs.getBigDecimal("quantityOut"))
                .amountOut(rs.getBigDecimal("amountOut"))
                .balanceBefore(rs.getBigDecimal("balanceBefore"))
                .balanceAfter(rs.getBigDecimal("balanceAfter"))
                .build(), params.toArray());
    }

    // 3. Stock Transfer Report
    public List<StockTransferReportResponse> getStockTransferReport(Long warehouseId, LocalDate startDate, LocalDate endDate, String search, String status) {
        StringBuilder sql = new StringBuilder(
                "SELECT " +
                        "st.transfer_date AS documentDate, " +
                        "st.transfer_code AS documentNumber, " +
                        "pv.sku AS itemCode, " +
                        "CONCAT(p.product_name, CASE WHEN pv.variant_name IS NULL OR pv.variant_name = '' THEN '' ELSE CONCAT(' - ', pv.variant_name) END) AS itemName, " +
                        "w_from.name AS sourceWarehouse, " +
                        "w_to.name AS destinationWarehouse, " +
                        "u.name AS unitName, " +
                        "COALESCE(actual.actual_quantity, stl.quantity) AS quantity, " +
                        "CASE WHEN actual.actual_quantity > 0 THEN actual.actual_amount / actual.actual_quantity ELSE NULL END AS unitPrice, " +
                        "actual.actual_amount AS amount, " +
                        "st.status AS status " +
                        "FROM stock_transfers st " +
                        "JOIN stock_transfer_lines stl ON st.id = stl.stock_transfer_id " +
                        "JOIN warehouses w_from ON st.from_warehouse_id = w_from.id " +
                        "JOIN warehouses w_to ON st.to_warehouse_id = w_to.id " +
                        "JOIN product_variants pv ON stl.variant_id = pv.id " +
                        "JOIN products p ON pv.product_id = p.id " +
                        "JOIN units u ON p.unit_id = u.id " +
                        "LEFT JOIN (" +
                        "  SELECT d.reference_id AS transfer_id, l.variant_id, " +
                        "         SUM(l.quantity_out) AS actual_quantity, " +
                        "         SUM(l.quantity_out * l.unit_cost) AS actual_amount " +
                        "  FROM inventory_documents d " +
                        "  JOIN inventory_ledger l ON l.inventory_document_id = d.id " +
                        "  WHERE d.reference_type = 'STOCK_TRANSFER' " +
                        "    AND d.issue_purpose = 'TRANSFER_EXPORT' " +
                        "    AND d.status = 'POSTED' " +
                        "  GROUP BY d.reference_id, l.variant_id" +
                        ") actual ON actual.transfer_id = st.id AND actual.variant_id = stl.variant_id " +
                        "WHERE 1=1 "
        );
        List<Object> params = new ArrayList<>();

        if (status != null && !status.trim().isEmpty()) {
            sql.append(" AND st.status = ? ");
            params.add(status);
        } else {
            // Default to not showing DRAFT or CANCELLED unless explicitly requested
            sql.append(" AND st.status IN ('APPROVED', 'IN_TRANSIT', 'POSTED') ");
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
            sql.append(" AND (pv.sku LIKE ? OR pv.variant_name LIKE ? OR p.product_code LIKE ? OR p.product_name LIKE ? OR st.transfer_code LIKE ?) ");
            params.add("%" + search + "%");
            params.add("%" + search + "%");
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
            "pl.account_type AS accountType, " +
            "COALESCE(SUM(CASE WHEN pl.created_at < CAST(? AS DATETIME) THEN pl.amount_debt - pl.amount_receipt ELSE 0 END), 0) AS openingBalance, " +
            "COALESCE(SUM(CASE WHEN pl.created_at >= CAST(? AS DATETIME) AND pl.created_at < CAST(? AS DATETIME) THEN pl.amount_debt ELSE 0 END), 0) AS debitIncrease, " +
            "COALESCE(SUM(CASE WHEN pl.created_at >= CAST(? AS DATETIME) AND pl.created_at < CAST(? AS DATETIME) THEN pl.amount_receipt ELSE 0 END), 0) AS creditDecrease " +
            "FROM partners pt " +
            "JOIN partner_ledger pl ON pt.id = pl.partner_id " +
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
                sql.append(" AND pl.account_type = 'RECEIVABLE' ");
            } else if (partnerType.equalsIgnoreCase("SUPPLIER")) {
                sql.append(" AND pl.account_type = 'PAYABLE' ");
            }
        }

        if (search != null && !search.trim().isEmpty()) {
            sql.append(" AND (pt.code LIKE ? OR pt.name LIKE ?) ");
            params.add("%" + search + "%");
            params.add("%" + search + "%");
        }

        sql.append(" GROUP BY pt.id, pt.code, pt.name, pl.account_type ORDER BY pt.code, pl.account_type");

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> {
            BigDecimal open = rs.getBigDecimal("openingBalance");
            BigDecimal inc = rs.getBigDecimal("debitIncrease");
            BigDecimal dec = rs.getBigDecimal("creditDecrease");
            BigDecimal close = open.add(inc).subtract(dec);
            String status = close.compareTo(BigDecimal.ZERO) > 0 ? "CO_NO"
                    : close.compareTo(BigDecimal.ZERO) < 0 ? "DU_CO" : "HET_NO";
            String type = "PAYABLE".equals(rs.getString("accountType")) ? "SUPPLIER" : "CUSTOMER";
            
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

    public List<SalesProfitReportResponse> getSalesProfitReport(Long warehouseId, LocalDateTime startDate,
                                                                 LocalDateTime endDate, String search) {
        StringBuilder sql = new StringBuilder("""
                SELECT sales.sku,
                       sales.variantName,
                       sales.unitName,
                       SUM(sales.quantitySold) AS quantitySold,
                       SUM(sales.salesAmount) AS salesAmount,
                       SUM(sales.vatAmount) AS vatAmount,
                       SUM(sales.totalAmount) AS totalAmount,
                       COALESCE(SUM(costs.costAmount), 0) AS costAmount
                FROM (
                    SELECT so.id AS salesOrderId,
                           COALESCE(sol.warehouse_id, so.warehouse_id) AS warehouseId,
                           pv.id AS variantId,
                           pv.sku,
                           pv.variant_name AS variantName,
                           u.name AS unitName,
                           SUM(sol.quantity) AS quantitySold,
                           SUM(sol.line_amount) AS salesAmount,
                           SUM(COALESCE(sol.vat_amount, 0)) AS vatAmount,
                           SUM(sol.line_amount + COALESCE(sol.vat_amount, 0)) AS totalAmount
                    FROM sales_order_lines sol
                    JOIN sales_orders so ON so.id = sol.sales_order_id
                    JOIN product_variants pv ON pv.id = sol.variant_id
                    JOIN products p ON p.id = pv.product_id
                    LEFT JOIN units u ON u.id = p.unit_id
                    WHERE so.status = 'POSTED'
                      AND (? IS NULL OR so.posted_at >= ?)
                      AND (? IS NULL OR so.posted_at < ?)
                      AND (? IS NULL OR COALESCE(sol.warehouse_id, so.warehouse_id) = ?)
                """);
        List<Object> params = new ArrayList<>();
        params.add(startDate);
        params.add(startDate);
        params.add(endDate);
        params.add(endDate);
        params.add(warehouseId);
        params.add(warehouseId);
        if (search != null && !search.isBlank()) {
            sql.append(" AND (LOWER(pv.sku) LIKE LOWER(?) OR LOWER(pv.variant_name) LIKE LOWER(?) OR LOWER(p.product_name) LIKE LOWER(?)) ");
            String keyword = "%" + search.trim() + "%";
            params.add(keyword);
            params.add(keyword);
            params.add(keyword);
        }
        sql.append("""
                    GROUP BY so.id, COALESCE(sol.warehouse_id, so.warehouse_id), pv.id, pv.sku, pv.variant_name, u.name
                ) sales
                LEFT JOIN (
                    SELECT d.sales_order_id, l.variant_id, l.warehouse_id,
                           SUM((l.quantity_out - l.quantity_in) * l.unit_cost) AS costAmount
                    FROM inventory_documents d
                    JOIN inventory_ledger l ON l.inventory_document_id = d.id
                    WHERE d.sales_order_id IS NOT NULL
                      AND d.doc_type = 'EX_SO'
                    GROUP BY d.sales_order_id, l.variant_id, l.warehouse_id
                ) costs ON costs.sales_order_id = sales.salesOrderId
                       AND costs.variant_id = sales.variantId
                       AND costs.warehouse_id = sales.warehouseId
                GROUP BY sales.variantId, sales.sku, sales.variantName, sales.unitName
                ORDER BY salesAmount DESC
                """);

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> {
            BigDecimal salesAmount = rs.getBigDecimal("salesAmount");
            BigDecimal costAmount = rs.getBigDecimal("costAmount");
            return SalesProfitReportResponse.builder()
                    .sku(rs.getString("sku"))
                    .variantName(rs.getString("variantName"))
                    .unitName(rs.getString("unitName"))
                    .quantitySold(rs.getBigDecimal("quantitySold"))
                    .salesAmount(salesAmount)
                    .vatAmount(rs.getBigDecimal("vatAmount"))
                    .totalAmount(rs.getBigDecimal("totalAmount"))
                    .costAmount(costAmount)
                    .grossProfit(salesAmount.subtract(costAmount))
                    .profitMarginPercent(BigDecimal.ZERO)
                    .build();
        }, params.toArray());
    }

    // 5. Inventory Summary Report
    public List<InventorySummaryReportResponse> getInventorySummaryReport(Long warehouseId, LocalDateTime startDate, LocalDateTime endDate, String search) {
        LocalDate targetDate = (startDate != null ? startDate.toLocalDate() : LocalDate.now()).minusDays(1);

        StringBuilder sql = new StringBuilder(
            "SELECT " +
            "w.name AS warehouseName, " +
            "pv.sku AS productCode, " +
            "CONCAT(p.product_name, CASE WHEN pv.variant_name IS NULL OR pv.variant_name = '' THEN '' ELSE CONCAT(' - ', pv.variant_name) END) AS productName, " +
            "u.name AS unitName, " +
            "COALESCE(MAX(ids.closing_quantity), COALESCE(SUM(CASE WHEN l.movement_at < CAST(? AS DATETIME) THEN l.quantity_in - l.quantity_out ELSE 0 END), 0)) AS openingQuantity, " +
            "COALESCE(MAX(ids.closing_value), COALESCE(SUM(CASE WHEN l.movement_at < CAST(? AS DATETIME) THEN (l.quantity_in * l.unit_cost) - (l.quantity_out * l.unit_cost) ELSE 0 END), 0)) AS openingValue, " +
            "COALESCE(SUM(CASE WHEN l.movement_at >= CAST(? AS DATETIME) AND l.movement_at < CAST(? AS DATETIME) THEN l.quantity_in ELSE 0 END), 0) AS receiptQuantity, " +
            "COALESCE(SUM(CASE WHEN l.movement_at >= CAST(? AS DATETIME) AND l.movement_at < CAST(? AS DATETIME) THEN l.quantity_in * l.unit_cost ELSE 0 END), 0) AS receiptValue, " +
            "COALESCE(SUM(CASE WHEN l.movement_at >= CAST(? AS DATETIME) AND l.movement_at < CAST(? AS DATETIME) THEN l.quantity_out ELSE 0 END), 0) AS issueQuantity, " +
            "COALESCE(SUM(CASE WHEN l.movement_at >= CAST(? AS DATETIME) AND l.movement_at < CAST(? AS DATETIME) THEN l.quantity_out * l.unit_cost ELSE 0 END), 0) AS issueValue " +
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
            sql.append(" AND (pv.sku LIKE ? OR pv.variant_name LIKE ? OR p.product_code LIKE ? OR p.product_name LIKE ?) ");
            params.add("%" + search + "%");
            params.add("%" + search + "%");
            params.add("%" + search + "%");
            params.add("%" + search + "%");
        }

        sql.append(" GROUP BY w.id, w.name, pv.id, pv.sku, pv.variant_name, p.product_name, u.name ");
        sql.append(" ORDER BY w.name, pv.sku ");

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

    public CashFlowReportResponse getCashFlowReport(LocalDateTime startDate, LocalDateTime endDateExclusive,
                                                     String search, String paymentMethod) {
        String methodFilter = paymentMethod != null && !paymentMethod.isBlank() ? paymentMethod.trim().toUpperCase() : null;
        String summarySql = """
                SELECT
                    COALESCE(SUM(CASE WHEN posted_at < ? AND payment_method = 'CASH'
                                      THEN CASE WHEN type = 'RECEIPT' THEN amount ELSE -amount END ELSE 0 END), 0) AS openingCash,
                    COALESCE(SUM(CASE WHEN posted_at >= ? AND posted_at < ? AND payment_method = 'CASH' AND type = 'RECEIPT' THEN amount ELSE 0 END), 0) AS cashReceipts,
                    COALESCE(SUM(CASE WHEN posted_at >= ? AND posted_at < ? AND payment_method = 'CASH' AND type = 'VOUCHER' THEN amount ELSE 0 END), 0) AS cashVouchers,
                    COALESCE(SUM(CASE WHEN posted_at < ? AND payment_method = 'BANK_TRANSFER'
                                      THEN CASE WHEN type = 'RECEIPT' THEN amount ELSE -amount END ELSE 0 END), 0) AS openingBank,
                    COALESCE(SUM(CASE WHEN posted_at >= ? AND posted_at < ? AND payment_method = 'BANK_TRANSFER' AND type = 'RECEIPT' THEN amount ELSE 0 END), 0) AS bankReceipts,
                    COALESCE(SUM(CASE WHEN posted_at >= ? AND posted_at < ? AND payment_method = 'BANK_TRANSFER' AND type = 'VOUCHER' THEN amount ELSE 0 END), 0) AS bankVouchers
                FROM payment_transactions
                WHERE status = 'POSTED'
                """;
        Map<String, Object> summary = jdbcTemplate.queryForMap(summarySql,
                startDate, startDate, endDateExclusive, startDate, endDateExclusive,
                startDate, startDate, endDateExclusive, startDate, endDateExclusive);

        StringBuilder rowsSql = new StringBuilder("""
                SELECT tx.id, tx.transaction_code, tx.type, tx.payment_method, tx.amount,
                       tx.note, tx.posted_at, COALESCE(pt.name, '') AS partner_name
                FROM payment_transactions tx
                LEFT JOIN partners pt ON pt.id = tx.partner_id
                WHERE tx.status = 'POSTED'
                  AND tx.posted_at >= ?
                  AND tx.posted_at < ?
                """);
        List<Object> params = new ArrayList<>();
        params.add(startDate);
        params.add(endDateExclusive);
        if (methodFilter != null) {
            rowsSql.append(" AND tx.payment_method = ? ");
            params.add(methodFilter);
        }
        if (search != null && !search.isBlank()) {
            rowsSql.append(" AND (tx.transaction_code LIKE ? OR pt.name LIKE ? OR tx.note LIKE ?) ");
            String keyword = "%" + search.trim() + "%";
            params.add(keyword);
            params.add(keyword);
            params.add(keyword);
        }
        rowsSql.append(" ORDER BY tx.posted_at DESC, tx.id DESC ");

        List<CashFlowTransactionResponse> transactions = jdbcTemplate.query(rowsSql.toString(), (rs, rowNum) ->
                CashFlowTransactionResponse.builder()
                        .id(rs.getLong("id"))
                        .code(rs.getString("transaction_code"))
                        .type(rs.getString("type"))
                        .paymentMethod(rs.getString("payment_method"))
                        .partnerName(rs.getString("partner_name"))
                        .amount(rs.getBigDecimal("amount"))
                        .note(rs.getString("note"))
                        .postedAt(rs.getTimestamp("posted_at").toLocalDateTime())
                        .build(), params.toArray());

        BigDecimal openingCash = toBigDecimal(summary.get("openingCash"));
        BigDecimal cashReceipts = toBigDecimal(summary.get("cashReceipts"));
        BigDecimal cashVouchers = toBigDecimal(summary.get("cashVouchers"));
        BigDecimal openingBank = toBigDecimal(summary.get("openingBank"));
        BigDecimal bankReceipts = toBigDecimal(summary.get("bankReceipts"));
        BigDecimal bankVouchers = toBigDecimal(summary.get("bankVouchers"));
        if ("CASH".equals(methodFilter)) {
            openingBank = BigDecimal.ZERO;
            bankReceipts = BigDecimal.ZERO;
            bankVouchers = BigDecimal.ZERO;
        } else if ("BANK_TRANSFER".equals(methodFilter)) {
            openingCash = BigDecimal.ZERO;
            cashReceipts = BigDecimal.ZERO;
            cashVouchers = BigDecimal.ZERO;
        }
        return CashFlowReportResponse.builder()
                .openingCash(openingCash)
                .cashReceipts(cashReceipts)
                .cashVouchers(cashVouchers)
                .closingCash(openingCash.add(cashReceipts).subtract(cashVouchers))
                .openingBank(openingBank)
                .bankReceipts(bankReceipts)
                .bankVouchers(bankVouchers)
                .closingBank(openingBank.add(bankReceipts).subtract(bankVouchers))
                .openingTotal(openingCash.add(openingBank))
                .totalReceipts(cashReceipts.add(bankReceipts))
                .totalVouchers(cashVouchers.add(bankVouchers))
                .closingTotal(openingCash.add(openingBank).add(cashReceipts).add(bankReceipts)
                        .subtract(cashVouchers).subtract(bankVouchers))
                .transactions(transactions)
                .build();
    }

    public List<RepairProfitReportResponse> getRepairProfitReport(Long warehouseId, LocalDate startDate, LocalDate endDate,
                                                                  String search) {
        String sql = """
                SELECT r.id AS repairId,
                       r.repair_code AS repairCode,
                       r.completed_date AS completedDate,
                       COALESCE(p.name, '') AS partnerName,
                       COALESCE(parts.partsRevenue, 0) AS partsRevenue,
                       COALESCE(fees.serviceRevenue, 0) AS serviceRevenue,
                       COALESCE(parts.partsVat, 0) + COALESCE(fees.serviceVat, 0) AS vatAmount,
                       COALESCE(costs.costAmount, 0) AS costAmount
                FROM repairs r
                LEFT JOIN partners p ON p.id = r.partner_id
                LEFT JOIN (
                    SELECT repair_id,
                           SUM(CASE WHEN action_type IN ('ADD', 'REPLACE')
                                    THEN quantity * unit_price ELSE 0 END) AS partsRevenue,
                           SUM(CASE WHEN action_type IN ('ADD', 'REPLACE')
                                    THEN quantity * unit_price * COALESCE(vat_percent, 0) / 100 ELSE 0 END) AS partsVat
                    FROM repair_lines
                    GROUP BY repair_id
                ) parts ON parts.repair_id = r.id
                LEFT JOIN (
                    SELECT repair_id,
                           SUM(COALESCE(quantity, 1) * fee_amount) AS serviceRevenue,
                           SUM(COALESCE(quantity, 1) * fee_amount * COALESCE(vat_percent, 0) / 100) AS serviceVat
                    FROM repair_fees
                    GROUP BY repair_id
                ) fees ON fees.repair_id = r.id
                LEFT JOIN (
                    SELECT d.reference_id AS repairId,
                           SUM((l.quantity_out - l.quantity_in) * l.unit_cost) AS costAmount
                    FROM inventory_documents d
                    JOIN inventory_ledger l ON l.inventory_document_id = d.id
                    WHERE d.reference_type = 'REPAIR'
                      AND d.doc_type = 'EX_SO'
                      AND d.status = 'POSTED'
                    GROUP BY d.reference_id
                ) costs ON costs.repairId = r.id
                WHERE r.repair_status = 'DONE'
                  AND (? IS NULL OR r.warehouse_id = ?)
                  AND (
                      NOT EXISTS (SELECT 1 FROM repair_lines used_part WHERE used_part.repair_id = r.id AND used_part.action_type IN ('ADD', 'REPLACE'))
                      OR EXISTS (
                          SELECT 1 FROM inventory_documents posted_export
                          WHERE posted_export.reference_type = 'REPAIR'
                            AND posted_export.reference_id = r.id
                            AND posted_export.doc_type = 'EX_SO'
                            AND posted_export.status = 'POSTED'
                      )
                  )
                  AND (
                      NOT EXISTS (SELECT 1 FROM repair_lines removed WHERE removed.repair_id = r.id AND removed.action_type IN ('REMOVE', 'REPLACE'))
                      OR EXISTS (
                          SELECT 1 FROM inventory_documents posted_scrap
                          WHERE posted_scrap.reference_type = 'REPAIR'
                            AND posted_scrap.reference_id = r.id
                            AND posted_scrap.doc_type = 'IN_PO'
                            AND posted_scrap.issue_purpose = 'SCRAP'
                            AND posted_scrap.status = 'POSTED'
                      )
                  )
                  AND (? IS NULL OR r.completed_date >= ?)
                  AND (? IS NULL OR r.completed_date < ?)
                  AND (? IS NULL OR LOWER(r.repair_code) LIKE LOWER(CONCAT('%', TRIM(?), '%'))
                       OR LOWER(COALESCE(p.name, '')) LIKE LOWER(CONCAT('%', TRIM(?), '%')))
                ORDER BY r.completed_date DESC, r.id DESC
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            BigDecimal partsRevenue = rs.getBigDecimal("partsRevenue");
            BigDecimal serviceRevenue = rs.getBigDecimal("serviceRevenue");
            BigDecimal revenue = partsRevenue.add(serviceRevenue);
            BigDecimal cost = rs.getBigDecimal("costAmount");
            BigDecimal profit = revenue.subtract(cost);
            BigDecimal margin = revenue.compareTo(BigDecimal.ZERO) > 0
                    ? profit.divide(revenue, 4, java.math.RoundingMode.HALF_UP)
                            .multiply(new BigDecimal("100"))
                    : BigDecimal.ZERO;
            return RepairProfitReportResponse.builder()
                    .repairId(rs.getLong("repairId"))
                    .repairCode(rs.getString("repairCode"))
                    .completedDate(rs.getDate("completedDate") != null
                            ? rs.getDate("completedDate").toLocalDate() : null)
                    .partnerName(rs.getString("partnerName"))
                    .partsRevenue(partsRevenue)
                    .serviceRevenue(serviceRevenue)
                    .vatAmount(rs.getBigDecimal("vatAmount"))
                    .costAmount(cost)
                    .grossProfit(profit)
                    .profitMarginPercent(margin)
                    .build();
        }, warehouseId, warehouseId, startDate, startDate, endDate, endDate, search, search, search);
    }

    // 6. Dashboard metrics
    public DashboardResponse getDashboardMetrics(String inventoryFlowRange, String categoryScope, String financeRange) {
        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        LocalDate endOfMonth = LocalDate.now();

        BigDecimal standardWarehouseInventoryValue = getStandardWarehouseInventoryValue();
        List<DashboardResponse.FinishedGoodInventoryDto> finishedGoodInventoryItems = getFinishedGoodInventoryItems();
        List<DashboardResponse.OrderSummaryDto> approvedPurchaseOrders = getApprovedPurchaseOrders();
        List<DashboardResponse.OrderSummaryDto> approvedSalesOrders = getApprovedSalesOrders();
        List<DashboardResponse.OrderSummaryDto> backorderedSalesOrders = getBackorderedSalesOrders();
        List<DashboardResponse.ConfiguredLowStockProductDto> configuredLowStockProducts = getConfiguredLowStockProducts();
        List<DashboardResponse.RepairSummaryDto> confirmedWarrantyRepairs = getConfirmedWarrantyRepairs();
        Map<String, Object> importExportMap = getImportExportMetrics(startOfMonth, endOfMonth);
        Map<String, Object> debtMap = getDebtMetrics();
        BigDecimal averageInventory = getAverageInventoryValue(startOfMonth, endOfMonth);
        BigDecimal consumedCost = getConsumedInventoryCost(startOfMonth, endOfMonth.plusDays(1));
        BigDecimal turnover = averageInventory.compareTo(BigDecimal.ZERO) > 0
                ? consumedCost.divide(averageInventory, 4, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal averageDays = turnover.compareTo(BigDecimal.ZERO) > 0
                ? BigDecimal.valueOf(endOfMonth.getDayOfMonth()).divide(turnover, 2, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return DashboardResponse.builder()
                .inventoryTurnoverRatio(turnover)
                .averageDaysInInventory(averageDays)
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
                .configuredLowStockProductsCount(configuredLowStockProducts.size())
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
                    DATE(l.movement_at) AS documentDate,
                    COALESCE(SUM(l.quantity_in), 0) AS totalImportQty,
                    COALESCE(SUM(l.quantity_out), 0) AS totalExportQty
                FROM inventory_ledger l
                WHERE l.movement_at >= ?
                  AND l.movement_at < ?
                GROUP BY DATE(l.movement_at)
                """;

        Map<LocalDate, DashboardResponse.InventoryFlowDto> flowMap = new HashMap<>();
        jdbcTemplate.query(sql, rs -> {
            LocalDate date = rs.getDate("documentDate").toLocalDate();
            flowMap.put(date, DashboardResponse.InventoryFlowDto.builder()
                    .label(toInventoryFlowLabel(date, rangeKey))
                    .importQuantity(rs.getBigDecimal("totalImportQty"))
                    .exportQuantity(rs.getBigDecimal("totalExportQty"))
                    .build());
        }, startDate.atStartOfDay(), endDate.plusDays(1).atStartOfDay());

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
                    COALESCE(SUM(icl.quantity_layered * icl.unit_cost), 0) AS inventoryValue
                FROM inventory_cost_layers icl
                JOIN product_variants pv ON icl.variant_id = pv.id
                JOIN products p ON pv.product_id = p.id
                JOIN warehouses w ON icl.warehouse_id = w.id
                LEFT JOIN product_categories pc ON p.category_id = pc.id
                WHERE w.type = 'STANDARD'
                  AND icl.quantity_layered > 0
                """);

        if ("finished".equals(normalizedScope)) {
            sql.append(" AND LOWER(TRIM(p.product_type)) IN ('thành phẩm', 'thanh pham') ");
        } else if ("nonfinished".equals(normalizedScope)) {
            sql.append(" AND LOWER(TRIM(p.product_type)) NOT IN ('thành phẩm', 'thanh pham') ");
        }

        sql.append("""
                GROUP BY COALESCE(pc.name, 'Khác')
                HAVING COALESCE(SUM(icl.quantity_layered * icl.unit_cost), 0) > 0
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
                    MONTH(posted_at) AS monthNumber,
                    COALESCE(SUM(CASE WHEN type = 'RECEIPT' THEN amount ELSE 0 END), 0) AS receipts,
                    COALESCE(SUM(CASE WHEN type = 'VOUCHER' THEN amount ELSE 0 END), 0) AS vouchers
                FROM payment_transactions
                WHERE status = 'POSTED'
                  AND YEAR(posted_at) = ?
                GROUP BY MONTH(posted_at)
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
                SELECT COALESCE(SUM(partner_balances.balance), 0) AS totalDebt
                FROM (
                    SELECT
                        pl.partner_id,
                        SUM(pl.amount_debt - pl.amount_receipt) AS balance
                    FROM partner_ledger pl
                    WHERE pl.account_type = 'RECEIVABLE'
                      AND pl.created_at < ?
                    GROUP BY pl.partner_id
                ) partner_balances
                WHERE partner_balances.balance > 0
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
                SELECT COALESCE(SUM(icl.quantity_layered * icl.unit_cost), 0) AS totalInventoryValue
                FROM inventory_cost_layers icl
                JOIN warehouses w ON icl.warehouse_id = w.id
                WHERE w.type = 'STANDARD'
                  AND icl.quantity_layered > 0
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


    private List<DashboardResponse.ConfiguredLowStockProductDto> getConfiguredLowStockProducts() {
        String sql = """
                SELECT
                    p.id AS productId,
                    pv.sku AS productCode,
                    CONCAT(p.product_name, ' - ', pv.variant_name) AS productName,
                    p.product_type AS productType,
                    u.name AS unitName,
                    COALESCE(pv.min_stock_qty, 0) AS minStockQty,
                    COALESCE(SUM(CASE
                        WHEN pv.tracking_mode IN ('SERIAL', 'SERIAL_LOT')
                             AND ib.serial_number_id IS NOT NULL
                             AND sn.status = 'AVAILABLE'
                             AND NOT EXISTS (
                                 SELECT 1 FROM device_component_serials dcs
                                 WHERE dcs.component_variant_id = ib.variant_id
                                   AND LOWER(dcs.component_serial) = LOWER(sn.serial_number)
                                   AND (dcs.status IS NULL OR dcs.status = 'ACTIVE')
                             ) THEN ib.quantity_on_hand
                        WHEN pv.tracking_mode NOT IN ('SERIAL', 'SERIAL_LOT')
                             AND ib.serial_number_id IS NULL THEN ib.quantity_on_hand - ib.quantity_reserved
                        ELSE 0 END), 0) AS stockQty
                FROM product_variants pv
                JOIN products p ON p.id = pv.product_id
                LEFT JOIN units u ON p.unit_id = u.id
                LEFT JOIN inventory_balances ib
                    ON ib.variant_id = pv.id
                LEFT JOIN serial_numbers sn ON sn.id = ib.serial_number_id
                WHERE p.active = TRUE
                  AND pv.active = TRUE
                  AND COALESCE(pv.min_stock_qty, 0) > 0
                  AND LOWER(TRIM(p.product_type)) NOT IN ('dịch vụ', 'dich vu', 'service')
                GROUP BY p.id, pv.id, pv.sku, p.product_name, pv.variant_name, p.product_type, u.name, pv.min_stock_qty
                HAVING stockQty <= COALESCE(pv.min_stock_qty, 0)
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
                    COALESCE(SUM(l.quantity_in * l.unit_cost), 0) AS totalImport,
                    COALESCE(SUM(l.quantity_out * l.unit_cost), 0) AS totalExport
                FROM inventory_ledger l
                WHERE l.movement_at >= ?
                  AND l.movement_at < ?
                """;
        return jdbcTemplate.queryForMap(sql, startOfMonth.atStartOfDay(), endOfMonth.plusDays(1).atStartOfDay());
    }

    private Map<String, Object> getDebtMetrics() {
        String sql = """
                SELECT
                    COALESCE(SUM(CASE WHEN balances.account_type = 'RECEIVABLE' AND balances.balance > 0 THEN balances.balance ELSE 0 END), 0) AS totalCustomerDebt,
                    COALESCE(SUM(CASE WHEN balances.account_type = 'PAYABLE' AND balances.balance > 0 THEN balances.balance ELSE 0 END), 0) AS totalSupplierDebt
                FROM (
                    SELECT partner_id, account_type, SUM(amount_debt - amount_receipt) AS balance
                    FROM partner_ledger
                    GROUP BY partner_id, account_type
                ) balances
                """;
        return jdbcTemplate.queryForMap(sql);
    }

    private Integer getNewWarrantyTickets(LocalDate startOfMonth, LocalDate endOfMonth) {
        String sql = "SELECT COUNT(id) FROM repairs WHERE received_date >= ? AND received_date <= ? " +
                "AND (COALESCE(under_warranty, FALSE) = TRUE OR warranty_id IS NOT NULL)";
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

    private BigDecimal getAverageInventoryValue(LocalDate startDate, LocalDate endDate) {
        String sql = """
                SELECT COALESCE(AVG(day_value), 0)
                FROM (
                    SELECT s.snapshot_date, SUM(s.closing_value) AS day_value
                    FROM inventory_daily_snapshots s
                    JOIN warehouses w ON w.id = s.warehouse_id
                    WHERE s.snapshot_date >= ? AND s.snapshot_date <= ?
                      AND w.type = 'STANDARD'
                    GROUP BY s.snapshot_date
                ) daily_values
                """;
        BigDecimal value = jdbcTemplate.queryForObject(sql, BigDecimal.class, startDate, endDate);
        return zeroIfNull(value);
    }

    private BigDecimal getConsumedInventoryCost(LocalDate startDate, LocalDate endDateExclusive) {
        String sql = """
                SELECT COALESCE(SUM((l.quantity_out - l.quantity_in) * l.unit_cost), 0)
                FROM inventory_ledger l
                JOIN inventory_documents d ON d.id = l.inventory_document_id
                JOIN warehouses w ON w.id = l.warehouse_id
                WHERE l.movement_at >= ?
                  AND l.movement_at < ?
                  AND d.doc_type = 'EX_SO'
                  AND (d.sales_order_id IS NOT NULL OR d.issue_purpose = 'REPAIR')
                  AND w.type = 'STANDARD'
                """;
        BigDecimal value = jdbcTemplate.queryForObject(sql, BigDecimal.class,
                startDate.atStartOfDay(), endDateExclusive.atStartOfDay());
        return zeroIfNull(value);
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
