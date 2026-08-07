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
        AND (:partnerId IS NULL OR so.partnerId = :partnerId)
        AND (:warehouseId IS NULL OR so.warehouseId = :warehouseId)
        AND (:fromDate IS NULL OR so.soDate >= :fromDate)
        AND (:toDate IS NULL OR so.soDate <= :toDate)
        ORDER BY so.createdAt DESC
    """)
    List<SalesOrder> findAllWithFilters(
        @Param("keyword") String keyword,
        @Param("status") String status,
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
}
