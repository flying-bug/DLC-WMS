package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.SalesOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SalesOrderRepository extends JpaRepository<SalesOrder, Long> {

    boolean existsBySoCode(String soCode);

    Optional<SalesOrder> findBySoCode(String soCode);

    @Query("""
        SELECT so FROM SalesOrder so
        LEFT JOIN FETCH so.partner p
        LEFT JOIN FETCH so.warehouse w
        LEFT JOIN FETCH so.createdByUser u
        WHERE (:keyword IS NULL OR LOWER(so.soCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
        AND (:status IS NULL OR so.status = :status)
        AND (:reservationStatus IS NULL OR EXISTS (
            SELECT 1 FROM StockReservation sr
            WHERE sr.salesOrderId = so.id AND sr.status = :reservationStatus
        ))
        AND (
            :exportDocumentStatus IS NULL
            OR (:exportDocumentStatus = 'NOT_CREATED' AND NOT EXISTS (
                SELECT 1 FROM InventoryDocument doc
                WHERE doc.salesOrderId = so.id
                  AND doc.docType = 'EX_SO'
                  AND (doc.status IS NULL OR doc.status <> 'CANCELLED')
            ))
            OR (:exportDocumentStatus = 'CREATED' AND EXISTS (
                SELECT 1 FROM InventoryDocument doc
                WHERE doc.salesOrderId = so.id
                  AND doc.docType = 'EX_SO'
                  AND (doc.status IS NULL OR doc.status <> 'CANCELLED')
            ))
        )
        AND (:partnerId IS NULL OR so.partnerId = :partnerId)
        AND (:warehouseId IS NULL OR so.warehouseId = :warehouseId)
        AND (:fromDate IS NULL OR so.soDate >= :fromDate)
        AND (:toDate IS NULL OR so.soDate <= :toDate)
        ORDER BY so.createdAt DESC
    """)
    List<SalesOrder> findAllWithFilters(
        @Param("keyword") String keyword,
        @Param("status") String status,
        @Param("reservationStatus") String reservationStatus,
        @Param("exportDocumentStatus") String exportDocumentStatus,
        @Param("partnerId") Long partnerId,
        @Param("warehouseId") Long warehouseId,
        @Param("fromDate") LocalDate fromDate,
        @Param("toDate") LocalDate toDate
    );

    @Query("""
        SELECT so FROM SalesOrder so
        LEFT JOIN FETCH so.partner
        LEFT JOIN FETCH so.warehouse
        LEFT JOIN FETCH so.createdByUser
        LEFT JOIN FETCH so.lines l
        LEFT JOIN FETCH l.variant v
        LEFT JOIN FETCH v.product
        WHERE so.id = :id
    """)
    Optional<SalesOrder> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT so.soCode FROM SalesOrder so WHERE so.soCode LIKE :prefixLike ORDER BY so.soCode DESC")
    List<String> findCodesByPrefix(@Param("prefixLike") String prefixLike);

    @Query("""
        SELECT new com.duylongtech.backend.dto.response.report.SalesProfitReportResponse(
            v.sku,
            v.variantName,
            u.name,
            SUM(l.quantity),
            SUM(l.lineAmount),
            SUM(l.costAmount),
            SUM(l.lineAmount) - SUM(l.costAmount),
            CAST(0 AS bigdecimal)
        )
        FROM SalesOrderLine l
        JOIN l.salesOrder so
        JOIN l.variant v
        JOIN v.product p
        LEFT JOIN p.unit u
        WHERE so.status = 'POSTED'
        AND (:keyword IS NULL OR LOWER(v.sku) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(v.variantName) LIKE LOWER(CONCAT('%', :keyword, '%')))
        AND (:fromDate IS NULL OR so.soDate >= :fromDate)
        AND (:toDate IS NULL OR so.soDate <= :toDate)
        GROUP BY v.sku, v.variantName, u.name
        ORDER BY SUM(l.lineAmount) DESC
    """)
    List<com.duylongtech.backend.dto.response.report.SalesProfitReportResponse> findSalesProfitReport(
        @Param("keyword") String keyword,
        @Param("fromDate") LocalDate fromDate,
        @Param("toDate") LocalDate toDate
    );
}
