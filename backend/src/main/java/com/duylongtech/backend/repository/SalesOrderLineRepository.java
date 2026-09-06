package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.SalesOrderLine;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SalesOrderLineRepository extends JpaRepository<SalesOrderLine, Long> {

    boolean existsByVariantIdIn(List<Long> variantIds);

    @Query(value = "SELECT so.id AS orderId, " +
            "so.so_code AS orderCode, " +
            "so.so_date AS orderDate, " +
            "COALESCE(NULLIF(pv.variant_name, ''), p.product_name) AS productName, " +
            "sol.quantity AS quantity, " +
            "sol.unit_price AS unitPrice, " +
            "sol.line_amount AS lineAmount, " +
            "so.status AS status, " +
            "GROUP_CONCAT(sn.serial_number ORDER BY sn.serial_number SEPARATOR ', ') AS serialNumber " +
            "FROM sales_order_lines sol " +
            "JOIN sales_orders so ON sol.sales_order_id = so.id " +
            "JOIN product_variants pv ON sol.variant_id = pv.id " +
            "JOIN products p ON pv.product_id = p.id " +
            "LEFT JOIN serial_numbers sn ON sn.sales_order_line_id = sol.id " +
            "WHERE so.partner_id = :customerId " +
            "AND so.status IN ('APPROVED', 'POSTED') " +
            "GROUP BY so.id, so.so_code, so.so_date, sol.id, sol.quantity, sol.unit_price, sol.line_amount, so.status, pv.variant_name, p.product_name " +
            "ORDER BY so.so_date DESC, so.id DESC, sol.id ASC",
            countQuery = "SELECT COUNT(sol.id) FROM sales_order_lines sol " +
                    "JOIN sales_orders so ON sol.sales_order_id = so.id " +
                    "WHERE so.partner_id = :customerId " +
                    "AND so.status IN ('APPROVED', 'POSTED')",
            nativeQuery = true)
    Page<Object[]> findSalesHistoryByCustomerId(@Param("customerId") Long customerId, Pageable pageable);
}
