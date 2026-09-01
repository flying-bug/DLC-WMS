package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

    boolean existsByPoCode(String poCode);

    @Query("""
        SELECT po FROM PurchaseOrder po
        LEFT JOIN FETCH po.partner p
        LEFT JOIN FETCH po.createdByUser u
        WHERE (:keyword IS NULL OR LOWER(po.poCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
        AND (:status IS NULL OR po.status = :status)
        AND (:partnerId IS NULL OR po.partnerId = :partnerId)
        AND (:fromDate IS NULL OR po.poDate >= :fromDate)
        AND (:toDate IS NULL OR po.poDate <= :toDate)
        ORDER BY po.createdAt DESC
    """)
    List<PurchaseOrder> findAllWithFilters(
        @Param("keyword") String keyword,
        @Param("status") String status,
        @Param("partnerId") Long partnerId,
        @Param("fromDate") LocalDate fromDate,
        @Param("toDate") LocalDate toDate
    );

    @Query("""
        SELECT DISTINCT po FROM PurchaseOrder po
        LEFT JOIN FETCH po.partner
        LEFT JOIN FETCH po.createdByUser
        LEFT JOIN FETCH po.lines l
        LEFT JOIN FETCH l.variant v
        LEFT JOIN FETCH v.product pr
        LEFT JOIN FETCH pr.unit
        WHERE po.id = :id
    """)
    Optional<PurchaseOrder> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT po.poCode FROM PurchaseOrder po WHERE po.poCode LIKE :prefixLike ORDER BY po.poCode DESC")
    List<String> findCodesByPrefix(@Param("prefixLike") String prefixLike);

    @Query("""
        SELECT DISTINCT po FROM PurchaseOrder po
        LEFT JOIN FETCH po.partner
        LEFT JOIN FETCH po.lines l
        WHERE po.status IN ('APPROVED', 'POSTED')
        ORDER BY po.createdAt DESC
    """)
    List<PurchaseOrder> findActiveOrdersForReminder();
}
