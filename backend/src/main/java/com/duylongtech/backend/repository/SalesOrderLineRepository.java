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

    @Query(value = "SELECT " +
            "so.so_code AS orderCode, " +
            "so.so_date AS orderDate, " +
            "pv.variant_name AS productName, " +
            "sol.quantity AS quantity, " +
            "sn.serial_number AS serialNumber " +
            "FROM SALES_ORDER_LINES sol " +
            "JOIN SALES_ORDERS so ON sol.sales_order_id = so.id " +
            "JOIN PRODUCT_VARIANTS pv ON sol.variant_id = pv.id " +
            "LEFT JOIN SERIAL_NUMBERS sn ON sn.sales_order_line_id = sol.id " +
            "WHERE so.partner_id = :customerId " +
            "ORDER BY so.so_date DESC, so.id DESC", 
            countQuery = "SELECT COUNT(sol.id) FROM SALES_ORDER_LINES sol " +
                         "JOIN SALES_ORDERS so ON sol.sales_order_id = so.id " +
                         "WHERE so.partner_id = :customerId",
            nativeQuery = true)
    Page<Object[]> findSalesHistoryByCustomerId(@Param("customerId") Long customerId, Pageable pageable);
}
