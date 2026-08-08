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

    @Query(value = "SELECT history.order_code AS orderCode, " +
            "history.order_date AS orderDate, history.product_name AS productName, " +
            "history.quantity AS quantity, history.serial_number AS serialNumber " +
            "FROM (" +
            "SELECT so.so_code AS order_code, so.so_date AS order_date, " +
            "COALESCE(NULLIF(pv.variant_name, ''), p.product_name) AS product_name, " +
            "sol.quantity AS quantity, " +
            "GROUP_CONCAT(sn.serial_number ORDER BY sn.serial_number SEPARATOR ', ') AS serial_number, " +
            "so.id AS sort_id, sol.id AS line_id " +
            "FROM sales_order_lines sol " +
            "JOIN sales_orders so ON sol.sales_order_id = so.id " +
            "JOIN product_variants pv ON sol.variant_id = pv.id " +
            "JOIN products p ON pv.product_id = p.id " +
            "LEFT JOIN serial_numbers sn ON sn.sales_order_line_id = sol.id " +
            "WHERE so.partner_id = :customerId " +
            "AND so.status IN ('APPROVED', 'POSTED') " +
            "AND NOT EXISTS (" +
            "SELECT 1 FROM inventory_documents linked_doc " +
            "WHERE linked_doc.doc_type = 'EX_SO' " +
            "AND linked_doc.status IN ('APPROVED', 'POSTED') " +
            "AND linked_doc.partner_id = so.partner_id " +
            "AND (linked_doc.sales_order_id = so.id " +
            "OR (linked_doc.reference_type = 'SALES_ORDER' AND linked_doc.reference_id = so.id))" +
            ") " +
            "GROUP BY so.id, so.so_code, so.so_date, sol.id, sol.quantity, pv.variant_name, p.product_name " +
            "UNION ALL " +
            "SELECT doc.doc_code AS order_code, doc.doc_date AS order_date, " +
            "COALESCE(NULLIF(pv.variant_name, ''), p.product_name) AS product_name, " +
            "line.quantity_out AS quantity, " +
            "COALESCE(NULLIF(line.serial_numbers_text, ''), sn.serial_number) AS serial_number, " +
            "doc.id AS sort_id, line.id AS line_id " +
            "FROM inventory_document_lines line " +
            "JOIN inventory_documents doc ON line.inventory_document_id = doc.id " +
            "JOIN product_variants pv ON line.variant_id = pv.id " +
            "JOIN products p ON pv.product_id = p.id " +
            "LEFT JOIN serial_numbers sn ON line.serial_number_id = sn.id " +
            "WHERE doc.partner_id = :customerId " +
            "AND doc.doc_type = 'EX_SO' " +
            "AND doc.status IN ('APPROVED', 'POSTED') " +
            "AND (doc.issue_purpose IS NULL OR doc.issue_purpose = 'SALES')" +
            ") history " +
            "ORDER BY history.order_date DESC, history.sort_id DESC, history.line_id ASC",
            countQuery = "SELECT " +
                    "(SELECT COUNT(sol.id) FROM sales_order_lines sol " +
                    "JOIN sales_orders so ON sol.sales_order_id = so.id " +
                    "WHERE so.partner_id = :customerId " +
                    "AND so.status IN ('APPROVED', 'POSTED') " +
                    "AND NOT EXISTS (" +
                    "SELECT 1 FROM inventory_documents linked_doc " +
                    "WHERE linked_doc.doc_type = 'EX_SO' " +
                    "AND linked_doc.status IN ('APPROVED', 'POSTED') " +
                    "AND linked_doc.partner_id = so.partner_id " +
                    "AND (linked_doc.sales_order_id = so.id " +
                    "OR (linked_doc.reference_type = 'SALES_ORDER' AND linked_doc.reference_id = so.id))" +
                    ")) + " +
                    "(SELECT COUNT(line.id) FROM inventory_document_lines line " +
                    "JOIN inventory_documents doc ON line.inventory_document_id = doc.id " +
                    "WHERE doc.partner_id = :customerId " +
                    "AND doc.doc_type = 'EX_SO' " +
                    "AND doc.status IN ('APPROVED', 'POSTED') " +
                    "AND (doc.issue_purpose IS NULL OR doc.issue_purpose = 'SALES'))",
            nativeQuery = true)
    Page<Object[]> findSalesHistoryByCustomerId(@Param("customerId") Long customerId, Pageable pageable);
}
