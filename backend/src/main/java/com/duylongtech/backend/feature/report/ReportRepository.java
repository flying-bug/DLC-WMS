package com.duylongtech.backend.feature.report;

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
import com.duylongtech.backend.feature.repair.Repair;

@Repository
@RequiredArgsConstructor
public class ReportRepository {
    private final JdbcTemplate jdbcTemplate;

    /*
     * Hàng quản lý serial = products.track_serial, đúng như nghiệp vụ ghi sổ kho và màn tồn kho
     * (InventoryBalanceRepository). Trước đây báo cáo dựa vào product_variants.tracking_mode - cột này để trống
     * hoặc NONE ở cả những mặt hàng có serial, nên báo cáo đếm dòng tồn tổng thay cho các dòng serial đang còn.
     */

    /**
     * Values inventory from FIFO only when the remaining FIFO quantity agrees with
     * the reportable GOOD balance. Legacy/manual stock can legitimately have no
     * cost layers; in that case using FIFO alone would silently value that stock at
     * zero, so the complete warehouse/variant pair falls back to average cost.
     */
    private static final String INVENTORY_VALUATION_SQL = """
            SELECT balances.warehouse_id,
                   balances.variant_id,
                   balances.balance_quantity,
                   CASE
                       WHEN ABS(COALESCE(fifo.fifo_quantity, 0) - balances.balance_quantity) < 0.0001
                           THEN COALESCE(fifo.fifo_value, 0)
                       ELSE balances.balance_value
                   END AS inventory_value
            FROM (
                SELECT ib.warehouse_id,
                       ib.variant_id,
                       SUM(CASE WHEN (
                           (COALESCE(p.track_serial, 0) = 1
                               AND ib.serial_number_id IS NOT NULL
                               AND sn.status = 'AVAILABLE'
                               AND NOT EXISTS (
                                   SELECT 1
                                   FROM device_component_serials dcs
                                   WHERE dcs.component_variant_id = ib.variant_id
                                     AND LOWER(dcs.component_serial) = LOWER(sn.serial_number)
                                     AND (dcs.status IS NULL OR dcs.status = 'ACTIVE')
                               ))
                           OR (COALESCE(p.track_serial, 0) = 0
                               AND ib.serial_number_id IS NULL)
                       ) THEN ib.quantity_on_hand ELSE 0 END) AS balance_quantity,
                       SUM(CASE WHEN (
                           (COALESCE(p.track_serial, 0) = 1
                               AND ib.serial_number_id IS NOT NULL
                               AND sn.status = 'AVAILABLE'
                               AND NOT EXISTS (
                                   SELECT 1
                                   FROM device_component_serials dcs
                                   WHERE dcs.component_variant_id = ib.variant_id
                                     AND LOWER(dcs.component_serial) = LOWER(sn.serial_number)
                                     AND (dcs.status IS NULL OR dcs.status = 'ACTIVE')
                               ))
                           OR (COALESCE(p.track_serial, 0) = 0
                               AND ib.serial_number_id IS NULL)
                       ) THEN ib.quantity_on_hand * ib.average_cost ELSE 0 END) AS balance_value
                FROM inventory_balances ib
                JOIN product_variants pv ON pv.id = ib.variant_id
                JOIN products p ON p.id = pv.product_id
                LEFT JOIN serial_numbers sn ON sn.id = ib.serial_number_id
                WHERE ib.stock_status = 'GOOD'
                GROUP BY ib.warehouse_id, ib.variant_id
            ) balances
            LEFT JOIN (
                SELECT warehouse_id,
                       variant_id,
                       SUM(quantity_layered) AS fifo_quantity,
                       SUM(quantity_layered * unit_cost) AS fifo_value
                FROM inventory_cost_layers
                WHERE quantity_layered > 0
                GROUP BY warehouse_id, variant_id
            ) fifo ON fifo.warehouse_id = balances.warehouse_id
                  AND fifo.variant_id = balances.variant_id
            WHERE balances.balance_quantity > 0
            """;

    /**
     * Số lượng theo đơn vị gốc của dòng phiếu (alias idl). unit_cost luôn tính theo đơn vị gốc nên phải nhân với
     * base_quantity; quantity_in/out là số theo đơn vị trên phiếu (vd. thùng) chỉ dùng khi không có quy đổi.
     */
    private static final String BASE_QTY_IN_SQL =
            "(CASE WHEN COALESCE(idl.quantity_in, 0) > 0 AND COALESCE(idl.base_quantity, 0) > 0 "
                    + "THEN idl.base_quantity ELSE COALESCE(idl.quantity_in, 0) END)";
    private static final String BASE_QTY_OUT_SQL =
            "(CASE WHEN COALESCE(idl.quantity_out, 0) > 0 AND COALESCE(idl.base_quantity, 0) > 0 "
                    + "THEN idl.base_quantity ELSE COALESCE(idl.quantity_out, 0) END)";

    /** Chuyển kho nội bộ không phải nhập/xuất thật; tính vào thì 1 lần chuyển bị đếm cả nhập lẫn xuất. */
    private static final String EXCLUDE_INTERNAL_TRANSFER_SQL =
            " AND COALESCE(idoc.issue_purpose, '') NOT IN ('TRANSFER_EXPORT', 'TRANSFER_IMPORT') ";

    /** Tên hàng theo biến thể (mã SKU là của biến thể); biến thể không đặt tên thì lấy tên sản phẩm. */
    private static final String VARIANT_NAME_SQL = "COALESCE(NULLIF(TRIM(pv.variant_name), ''), p.product_name)";

    /**
     * Loại nghiệp vụ của một dòng thẻ kho. Phân loại theo chứng từ gốc (reference_type) trước rồi mới tới mục đích,
     * vì phiếu kiểm kê, nhập thành phẩm lắp ráp (PRODUCTION) hay nhập thu hồi sửa chữa (SCRAP) không mang mục đích
     * ASSEMBLY/REPAIR và trước đây bị xếp nhầm thành mua/bán hàng. Dòng bỏ ghi sổ là bút toán đảo, tách riêng.
     */
    private static final String LEDGER_DOCUMENT_TYPE_SQL = """
            CASE
              WHEN l.movement_type LIKE 'UNPOST%' THEN
                CASE WHEN doc.doc_type = 'EX_SO' THEN 'UNPOST_EX' ELSE 'UNPOST_IN' END
              WHEN doc.issue_purpose IN ('TRANSFER_EXPORT', 'TRANSFER_IMPORT') THEN
                CASE WHEN doc.doc_type = 'EX_SO' THEN 'EX_TRF' ELSE 'IN_TRF' END
              WHEN doc.issue_purpose = 'INVENTORY_ADJUSTMENT'
                   OR doc.reference_type IN ('STOCKTAKE', 'STOCK_TAKE', 'STOCKTAKE_ADJUSTMENT') THEN
                CASE WHEN doc.doc_type = 'EX_SO' THEN 'EX_ADJ' ELSE 'IN_ADJ' END
              WHEN doc.reference_type = 'REPAIR' OR doc.issue_purpose IN ('REPAIR', 'SCRAP') THEN
                CASE WHEN doc.doc_type = 'EX_SO' THEN 'EX_REPAIR' ELSE 'IN_REPAIR' END
              WHEN doc.reference_type = 'ASSEMBLY_ORDER' OR doc.issue_purpose IN ('ASSEMBLY', 'PRODUCTION') THEN
                CASE WHEN doc.doc_type = 'EX_SO' THEN 'EX_BUILD' ELSE 'IN_BUILD' END
              WHEN doc.doc_type = 'EX_SO' AND doc.issue_purpose = 'USAGE' THEN 'EX_USAGE'
              ELSE doc.doc_type
            END""";

    /** Kỳ báo cáo không chọn ngày ("Toàn bộ thời gian"): từ đầu tới hiện tại, thay vì so sánh với NULL ra toàn số 0. */
    static LocalDateTime periodStart(LocalDateTime startDate) {
        return startDate != null ? startDate : LocalDateTime.of(1900, 1, 1, 0, 0);
    }

    static LocalDateTime periodEnd(LocalDateTime endDate) {
        return endDate != null ? endDate : LocalDateTime.now();
    }

    /**
     * Giới hạn truy vấn theo danh sách kho người dùng được xem. null = không giới hạn; danh sách rỗng
     * phải được chặn trước khi gọi (không có kho nào thì không truy vấn).
     */
    private static void appendWarehouseFilter(StringBuilder sql, List<Object> params, List<Long> warehouseIds,
                                              String... columns) {
        if (warehouseIds == null) {
            return;
        }
        String placeholders = String.join(", ", java.util.Collections.nCopies(warehouseIds.size(), "?"));
        List<String> conditions = new ArrayList<>();
        for (String column : columns) {
            conditions.add(column + " IN (" + placeholders + ")");
            params.addAll(warehouseIds);
        }
        sql.append(" AND (").append(String.join(" OR ", conditions)).append(") ");
    }

    /** Tìm theo mã SKU / tên biến thể lẫn mã / tên sản phẩm (truy vấn phải có alias pv và p). */
    private static void appendItemSearch(StringBuilder sql, List<Object> params, String search) {
        if (search == null || search.trim().isEmpty()) {
            return;
        }
        String like = "%" + search.trim() + "%";
        sql.append(" AND (pv.sku LIKE ? OR pv.variant_name LIKE ? OR p.product_code LIKE ? OR p.product_name LIKE ?) ");
        params.add(like);
        params.add(like);
        params.add(like);
        params.add(like);
    }

    // 1. Inventory Balance Report
    public List<InventoryBalanceReportResponse> getInventoryBalanceReport(String search, List<Long> warehouseIds) {
        if (warehouseIds != null && warehouseIds.isEmpty()) {
            return List.of();
        }
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
                        "(COALESCE(p.track_serial, 0) = 1) AS trackSerial, " +
                        "SUM(CASE WHEN ( " +
                        "  (COALESCE(p.track_serial, 0) = 1 " +
                        "    AND ib.serial_number_id IS NOT NULL " +
                        "    AND sn.status = 'AVAILABLE' " +
                        "    AND NOT EXISTS ( " +
                        "      SELECT 1 FROM device_component_serials dcs " +
                        "      WHERE dcs.component_variant_id = ib.variant_id " +
                        "        AND LOWER(dcs.component_serial) = LOWER(sn.serial_number) " +
                        "        AND (dcs.status IS NULL OR dcs.status = 'ACTIVE') " +
                        "    ) " +
                        "  ) " +
                        "  OR (COALESCE(p.track_serial, 0) = 0 AND ib.serial_number_id IS NULL) " +
                        ") THEN ib.quantity_on_hand ELSE 0 END) AS totalQuantity, " +
                        "SUM(CASE WHEN ib.serial_number_id IS NULL THEN ib.quantity_reserved ELSE 0 END) AS totalReserved, " +
                        "( " +
                        "  SUM(CASE WHEN ( " +
                        "    (COALESCE(p.track_serial, 0) = 1 " +
                        "      AND ib.serial_number_id IS NOT NULL " +
                        "      AND sn.status = 'AVAILABLE' " +
                        "      AND NOT EXISTS ( " +
                        "        SELECT 1 FROM device_component_serials dcs " +
                        "        WHERE dcs.component_variant_id = ib.variant_id " +
                        "          AND LOWER(dcs.component_serial) = LOWER(sn.serial_number) " +
                        "          AND (dcs.status IS NULL OR dcs.status = 'ACTIVE') " +
                        "      ) " +
                        "    ) " +
                        "    OR (COALESCE(p.track_serial, 0) = 0 AND ib.serial_number_id IS NULL) " +
                        "  ) THEN ib.quantity_on_hand ELSE 0 END) " +
                        "  - " +
                        "  SUM(CASE WHEN ib.serial_number_id IS NULL THEN ib.quantity_reserved ELSE 0 END) " +
                        ") AS availableQuantity, " +
                        "COALESCE(MAX(valuation.inventory_value), 0) AS totalValue " +
                        "FROM inventory_balances ib " +
                        "JOIN product_variants pv ON ib.variant_id = pv.id " +
                        "JOIN products p ON pv.product_id = p.id " +
                        "JOIN units u ON p.unit_id = u.id " +
                        "JOIN warehouses w ON ib.warehouse_id = w.id " +
                        "LEFT JOIN serial_numbers sn ON ib.serial_number_id = sn.id " +
                        "LEFT JOIN (" + INVENTORY_VALUATION_SQL + ") valuation " +
                        "  ON valuation.warehouse_id = ib.warehouse_id AND valuation.variant_id = ib.variant_id " +
                        "WHERE ib.stock_status = 'GOOD' " +
                        "AND ( " +
                        "  (COALESCE(p.track_serial, 0) = 1) " +
                        "  OR (COALESCE(p.track_serial, 0) = 0 AND ib.serial_number_id IS NULL) " +
                        ") "
        );
        List<Object> params = new ArrayList<>();

        appendWarehouseFilter(sql, params, warehouseIds, "ib.warehouse_id");
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
    public List<StockLedgerReportResponse> getStockLedgerReport(List<Long> warehouseIds, LocalDateTime startDate, LocalDateTime endDate, String search) {
        if (warehouseIds != null && warehouseIds.isEmpty()) {
            return List.of();
        }
        StringBuilder sql = new StringBuilder(
                "SELECT " +
                        "w.name AS warehouseName, " +
                        "pv.sku AS productCode, " +
                        VARIANT_NAME_SQL + " AS productName, " +
                        "doc.note AS description, " +
                        "l.movement_at AS movementAt, " +
                        "doc.id AS documentId, " +
                        "doc.doc_date AS documentDate, " +
                        "doc.doc_code AS documentNumber, " +
                        LEDGER_DOCUMENT_TYPE_SQL + " AS documentType, " +
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

        appendWarehouseFilter(sql, params, warehouseIds, "l.warehouse_id");
        if (startDate != null) {
            sql.append(" AND l.movement_at >= ? ");
            params.add(startDate);
        }
        if (endDate != null) {
            sql.append(" AND l.movement_at <= ? ");
            params.add(endDate);
        }
        appendItemSearch(sql, params, search);

        sql.append(" ORDER BY l.movement_at DESC, l.id DESC ");

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
    public List<StockTransferReportResponse> getStockTransferReport(List<Long> warehouseIds, LocalDate startDate, LocalDate endDate, String search, String status) {
        if (warehouseIds != null && warehouseIds.isEmpty()) {
            return List.of();
        }
        StringBuilder sql = new StringBuilder(
                "SELECT " +
                        "st.transfer_date AS documentDate, " +
                        "st.transfer_code AS documentNumber, " +
                        "pv.sku AS itemCode, " +
                        VARIANT_NAME_SQL + " AS itemName, " +
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
            // Mặc định bỏ phiếu nháp / đã hủy. Phiếu đi APPROVED (chờ xuất) -> IN_TRANSIT (đã xuất, đang chuyển)
            // -> POSTED (kho nhận đã nhập); trước đây thiếu IN_TRANSIT nên hàng đang trên đường không hiện.
            sql.append(" AND st.status IN ('APPROVED', 'IN_TRANSIT', 'POSTED') ");
        }

        appendWarehouseFilter(sql, params, warehouseIds, "st.from_warehouse_id", "st.to_warehouse_id");
        if (startDate != null) {
            sql.append(" AND st.transfer_date >= ? ");
            params.add(startDate);
        }
        if (endDate != null) {
            sql.append(" AND st.transfer_date <= ? ");
            params.add(endDate);
        }
        if (search != null && !search.trim().isEmpty()) {
            String like = "%" + search.trim() + "%";
            sql.append(" AND (pv.sku LIKE ? OR pv.variant_name LIKE ? OR p.product_name LIKE ? OR st.transfer_code LIKE ?) ");
            params.add(like);
            params.add(like);
            params.add(like);
            params.add(like);
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
            
        LocalDateTime from = periodStart(startDate);
        LocalDateTime to = periodEnd(endDate);
        List<Object> params = new ArrayList<>();
        params.add(from);
        params.add(from);
        params.add(to);
        params.add(from);
        params.add(to);

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

        sql.append(" GROUP BY pt.id, pt.code, pt.name, pt.is_customer, pt.is_supplier ");
        // Chỉ liệt kê đối tác có số dư hoặc có phát sinh trong kỳ
        sql.append(" HAVING openingBalance <> 0 OR debitIncrease <> 0 OR creditDecrease <> 0 ");
        sql.append(" ORDER BY pt.code");

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> {
            BigDecimal open = rs.getBigDecimal("openingBalance");
            BigDecimal inc = rs.getBigDecimal("debitIncrease");
            BigDecimal dec = rs.getBigDecimal("creditDecrease");
            BigDecimal close = open.add(inc).subtract(dec);
            String status = close.compareTo(BigDecimal.ZERO) > 0 ? "CO_NO" : "HET_NO";
            
            boolean isCust = rs.getBoolean("isCustomer");
            boolean isSupp = rs.getBoolean("isSupplier");
            // Đối tác vừa là khách vừa là NCC: khi đang lọc theo NCC thì hiển thị là NCC
            String type = "SUPPLIER".equalsIgnoreCase(partnerType) && isSupp ? "SUPPLIER"
                    : isCust ? "CUSTOMER" : (isSupp ? "SUPPLIER" : "OTHER");
            
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
    /**
     * Nhập - xuất - tồn theo (kho, biến thể/SKU), cùng cấp chi tiết với báo cáo tồn kho hiện tại.
     * <ul>
     *   <li>Tồn đầu kỳ: snapshot chốt sổ ngày trước kỳ nếu có, không thì cộng thẻ kho trước kỳ.</li>
     *   <li>Nhập / xuất trong kỳ là số thuần: bút toán bỏ ghi sổ (UNPOST_*) trừ vào đúng cột của chứng từ gốc,
     *       không cộng sang cột ngược lại - trước đây ghi sổ rồi bỏ ghi sổ làm cả cột nhập lẫn xuất phồng lên.</li>
     *   <li>Kỳ không chọn ngày = từ đầu tới hiện tại.</li>
     * </ul>
     */
    public List<InventorySummaryReportResponse> getInventorySummaryReport(List<Long> warehouseIds, LocalDateTime startDate, LocalDateTime endDate, String search) {
        if (warehouseIds != null && warehouseIds.isEmpty()) {
            return List.of();
        }
        LocalDateTime from = periodStart(startDate);
        LocalDateTime to = periodEnd(endDate);
        LocalDate snapshotDate = from.toLocalDate().minusDays(1);

        String inPeriod = "l.movement_at >= CAST(? AS DATETIME) AND l.movement_at <= CAST(? AS DATETIME)";
        String receiptQty = "CASE WHEN l.movement_type LIKE 'UNPOST%' THEN -l.quantity_out ELSE l.quantity_in END";
        String issueQty = "CASE WHEN l.movement_type LIKE 'UNPOST%' THEN -l.quantity_in ELSE l.quantity_out END";

        StringBuilder sql = new StringBuilder(
            "SELECT w.name AS warehouseName, " +
            "pv.sku AS productCode, " +
            VARIANT_NAME_SQL + " AS productName, " +
            "u.name AS unitName, " +
            "COALESCE(MAX(ids.closing_quantity), SUM(CASE WHEN l.movement_at < CAST(? AS DATETIME) THEN l.quantity_in - l.quantity_out ELSE 0 END)) AS openingQuantity, " +
            "COALESCE(MAX(ids.closing_value), SUM(CASE WHEN l.movement_at < CAST(? AS DATETIME) THEN (l.quantity_in - l.quantity_out) * l.unit_cost ELSE 0 END)) AS openingValue, " +
            "SUM(CASE WHEN " + inPeriod + " THEN " + receiptQty + " ELSE 0 END) AS receiptQuantity, " +
            "SUM(CASE WHEN " + inPeriod + " THEN (" + receiptQty + ") * l.unit_cost ELSE 0 END) AS receiptValue, " +
            "SUM(CASE WHEN " + inPeriod + " THEN " + issueQty + " ELSE 0 END) AS issueQuantity, " +
            "SUM(CASE WHEN " + inPeriod + " THEN (" + issueQty + ") * l.unit_cost ELSE 0 END) AS issueValue " +
            "FROM inventory_ledger l " +
            "JOIN warehouses w ON w.id = l.warehouse_id " +
            "JOIN product_variants pv ON pv.id = l.variant_id " +
            "JOIN products p ON p.id = pv.product_id " +
            "JOIN units u ON u.id = p.unit_id " +
            "LEFT JOIN inventory_daily_snapshots ids ON ids.snapshot_date = ? AND ids.warehouse_id = l.warehouse_id AND ids.variant_id = l.variant_id " +
            // Dòng phát sinh sau cuối kỳ không thuộc báo cáo (kể cả tồn đầu kỳ tính từ thẻ kho)
            "WHERE l.movement_at <= CAST(? AS DATETIME) "
        );

        List<Object> params = new ArrayList<>();
        params.add(from);
        params.add(from);
        for (int i = 0; i < 4; i++) {
            params.add(from);
            params.add(to);
        }
        params.add(snapshotDate);
        params.add(to);

        appendWarehouseFilter(sql, params, warehouseIds, "l.warehouse_id");
        appendItemSearch(sql, params, search);
        sql.append(" GROUP BY w.id, w.name, pv.id, pv.sku, pv.variant_name, p.product_name, u.name ");
        sql.append(" ORDER BY w.name, pv.sku ");

        List<InventorySummaryReportResponse> rows = jdbcTemplate.query(sql.toString(), (rs, rowNum) -> {
            BigDecimal opQ = zeroIfNull(rs.getBigDecimal("openingQuantity"));
            BigDecimal opV = zeroIfNull(rs.getBigDecimal("openingValue"));
            BigDecimal rq = zeroIfNull(rs.getBigDecimal("receiptQuantity"));
            BigDecimal rv = zeroIfNull(rs.getBigDecimal("receiptValue"));
            BigDecimal iq = zeroIfNull(rs.getBigDecimal("issueQuantity"));
            BigDecimal iv = zeroIfNull(rs.getBigDecimal("issueValue"));

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
        // Bỏ các mã không có tồn đầu, không phát sinh và không còn tồn cuối trong kỳ
        return rows.stream()
                .filter(r -> r.getOpeningQuantity().signum() != 0 || r.getReceiptQuantity().signum() != 0
                        || r.getIssueQuantity().signum() != 0 || r.getEndingQuantity().signum() != 0)
                .toList();
    }

    public List<RepairProfitReportResponse> getRepairProfitReport(LocalDate startDate, LocalDate endDate,
                                                                  String search, List<Long> warehouseIds) {
        if (warehouseIds != null && warehouseIds.isEmpty()) {
            return List.of();
        }

        StringBuilder sql = new StringBuilder("""
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
                    -- Linh kiện / dịch vụ miễn phí bảo hành không có doanh thu (giống cách màn Lệnh sửa chữa tính tổng),
                    -- nhưng giá vốn linh kiện xuất ra vẫn tính ở bảng costs bên dưới.
                    SELECT repair_id,
                           SUM(CASE WHEN action_type IN ('ADD', 'REPLACE') AND NOT is_free_warranty
                                    THEN quantity * unit_price ELSE 0 END) AS partsRevenue,
                           SUM(CASE WHEN action_type IN ('ADD', 'REPLACE') AND NOT is_free_warranty
                                    THEN quantity * unit_price * COALESCE(vat_percent, 0) / 100 ELSE 0 END) AS partsVat
                    FROM repair_lines
                    GROUP BY repair_id
                ) parts ON parts.repair_id = r.id
                LEFT JOIN (
                    SELECT repair_id,
                           SUM(CASE WHEN NOT is_free_warranty THEN COALESCE(quantity, 1) * fee_amount ELSE 0 END) AS serviceRevenue,
                           SUM(CASE WHEN NOT is_free_warranty
                                    THEN COALESCE(quantity, 1) * fee_amount * COALESCE(vat_percent, 0) / 100 ELSE 0 END) AS serviceVat
                    FROM repair_fees
                    GROUP BY repair_id
                ) fees ON fees.repair_id = r.id
                LEFT JOIN (
                    SELECT d.reference_id AS repairId,
                           SUM(l.quantity_out * l.unit_cost) AS costAmount
                    FROM inventory_documents d
                    JOIN inventory_document_lines l ON l.inventory_document_id = d.id
                    WHERE d.reference_type = 'REPAIR'
                      AND d.doc_type = 'EX_SO'
                      AND d.status = 'POSTED'
                    GROUP BY d.reference_id
                ) costs ON costs.repairId = r.id
                WHERE r.repair_status = 'DONE'
                  AND (? IS NULL OR r.completed_date >= ?)
                  AND (? IS NULL OR r.completed_date <= ?)
                  AND (? IS NULL OR LOWER(r.repair_code) LIKE LOWER(CONCAT('%', TRIM(?), '%'))
                       OR LOWER(COALESCE(p.name, '')) LIKE LOWER(CONCAT('%', TRIM(?), '%')))
                """);

        List<Object> params = new ArrayList<>();
        params.add(startDate);
        params.add(startDate);
        params.add(endDate);
        params.add(endDate);
        params.add(search);
        params.add(search);
        params.add(search);

        if (warehouseIds != null) {
            sql.append(" AND r.warehouse_id IN (")
                    .append(String.join(", ", java.util.Collections.nCopies(warehouseIds.size(), "?")))
                    .append(") ");
            params.addAll(warehouseIds);
        }
        sql.append(" ORDER BY r.completed_date DESC, r.id DESC ");

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> {
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
        List<DashboardResponse.RepairSummaryDto> pendingApprovalWarrantyRepairs = getPendingApprovalWarrantyRepairs();
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
                .pendingApprovalWarrantyRepairs(pendingApprovalWarrantyRepairs)
                .approvedPurchaseOrdersCount(approvedPurchaseOrders.size())
                .approvedSalesOrdersCount(approvedSalesOrders.size())
                .backorderedSalesOrdersCount(backorderedSalesOrders.size())
                .pendingApprovalWarrantyRepairsCount(pendingApprovalWarrantyRepairs.size())
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
                    COALESCE(SUM(""" + BASE_QTY_IN_SQL + """
                    ), 0) AS totalImportQty,
                    COALESCE(SUM(""" + BASE_QTY_OUT_SQL + """
                    ), 0) AS totalExportQty
                FROM inventory_documents idoc
                JOIN inventory_document_lines idl ON idoc.id = idl.inventory_document_id
                WHERE idoc.status = 'POSTED'
                  AND idoc.doc_date >= ?
                  AND idoc.doc_date <= ?
                """ + EXCLUDE_INTERNAL_TRANSFER_SQL + """
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
                    COALESCE(SUM(valuation.inventory_value), 0) AS inventoryValue
                FROM (
                """ + INVENTORY_VALUATION_SQL + """
                ) valuation
                JOIN product_variants pv ON valuation.variant_id = pv.id
                JOIN products p ON pv.product_id = p.id
                JOIN warehouses w ON valuation.warehouse_id = w.id
                LEFT JOIN product_categories pc ON p.category_id = pc.id
                WHERE w.type = 'STANDARD'
                """);

        if ("finished".equals(normalizedScope)) {
            sql.append(" AND LOWER(TRIM(p.product_type)) IN ('thành phẩm', 'thanh pham') ");
        } else if ("nonfinished".equals(normalizedScope)) {
            sql.append(" AND LOWER(TRIM(p.product_type)) NOT IN ('thành phẩm', 'thanh pham') ");
        }

        sql.append("""
                GROUP BY COALESCE(pc.name, 'Khác')
                HAVING COALESCE(SUM(valuation.inventory_value), 0) > 0
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
                SELECT COALESCE(SUM(valuation.inventory_value), 0) AS totalInventoryValue
                FROM (
                """ + INVENTORY_VALUATION_SQL + """
                ) valuation
                JOIN warehouses w ON valuation.warehouse_id = w.id
                WHERE w.type = 'STANDARD'
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


    private List<DashboardResponse.RepairSummaryDto> getPendingApprovalWarrantyRepairs() {
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
                WHERE r.repair_status = 'WAITING_FOR_APPROVAL'
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
                    COALESCE(SUM(CASE WHEN idoc.doc_type = 'IN_PO' THEN """ + BASE_QTY_IN_SQL + """
                         * idl.unit_cost ELSE 0 END), 0) AS totalImport,
                    COALESCE(SUM(CASE WHEN idoc.doc_type = 'EX_SO' THEN """ + BASE_QTY_OUT_SQL + """
                         * idl.unit_cost ELSE 0 END), 0) AS totalExport
                FROM inventory_documents idoc
                JOIN inventory_document_lines idl ON idoc.id = idl.inventory_document_id
                WHERE idoc.status = 'POSTED'
                  AND idoc.doc_date >= ?
                  AND idoc.doc_date <= ?
                """ + EXCLUDE_INTERNAL_TRANSFER_SQL;
        return jdbcTemplate.queryForMap(sql, startOfMonth, endOfMonth);
    }

    /**
     * balance_after là số dư lũy kế của đối tác sau mỗi bút toán, nên dư nợ hiện tại là dòng mới nhất của từng
     * đối tác (giống getCustomerClosingDebtForMonth). Bản cũ cộng mọi dòng nên số dư bị nhân lên theo số giao dịch,
     * và khi lỗi thì lặng lẽ lấy tổng tiền thu/chi thay cho công nợ.
     */
    private Map<String, Object> getDebtMetrics() {
        String sql = """
                SELECT
                    COALESCE(SUM(CASE WHEN latest.is_customer = 1 AND latest.balance_after > 0 THEN latest.balance_after ELSE 0 END), 0) AS totalCustomerDebt,
                    COALESCE(SUM(CASE WHEN latest.is_supplier = 1 AND latest.balance_after > 0 THEN latest.balance_after ELSE 0 END), 0) AS totalSupplierDebt
                FROM (
                    SELECT
                        pt.is_customer,
                        pt.is_supplier,
                        pl.balance_after,
                        ROW_NUMBER() OVER (PARTITION BY pl.partner_id ORDER BY pl.created_at DESC, pl.id DESC) AS rn
                    FROM partner_ledger pl
                    JOIN partners pt ON pl.partner_id = pt.id
                ) latest
                WHERE latest.rn = 1
                """;
        return jdbcTemplate.queryForMap(sql);
    }

    private Integer getNewWarrantyTickets(LocalDate startOfMonth, LocalDate endOfMonth) {
        // Chỉ đếm lệnh sửa chữa bảo hành, không đếm mọi lệnh sửa.
        String sql = "SELECT COUNT(id) FROM repairs WHERE received_date >= ? AND received_date <= ? "
                + "AND (COALESCE(under_warranty, FALSE) = TRUE OR warranty_id IS NOT NULL)";
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
