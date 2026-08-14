package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.StockReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface StockReservationRepository extends JpaRepository<StockReservation, Long> {

    List<StockReservation> findBySalesOrderId(Long salesOrderId);

    List<StockReservation> findBySalesOrderIdAndStatus(Long salesOrderId, String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT r FROM StockReservation r
        WHERE r.variantId = :variantId AND r.warehouseId = :warehouseId AND r.status = :status
    """)
    List<StockReservation> findActiveByVariantAndWarehouseForUpdate(
        @Param("variantId") Long variantId,
        @Param("warehouseId") Long warehouseId,
        @Param("status") String status
    );

    @Query("""
        SELECT COALESCE(SUM(r.quantityReserved), 0)
        FROM StockReservation r
        WHERE r.variantId = :variantId AND r.warehouseId = :warehouseId AND r.status = 'HOLDING'
    """)
    BigDecimal sumHoldingQuantity(@Param("variantId") Long variantId, @Param("warehouseId") Long warehouseId);

    // Tìm tất cả reservation HOLDING đã hết hạn — dùng cho scheduled job
    @Query("""
        SELECT r FROM StockReservation r
        WHERE r.status = 'HOLDING' AND r.expiresAt < :now
    """)
    List<StockReservation> findExpiredHolding(@Param("now") LocalDateTime now);

    // Tìm reservation theo SO line (variant + warehouse + SO)
    Optional<StockReservation> findBySalesOrderIdAndVariantIdAndWarehouseId(
        Long salesOrderId, Long variantId, Long warehouseId
    );

    @Modifying
    @Query("""
        UPDATE StockReservation r SET r.status = :newStatus
        WHERE r.salesOrderId = :salesOrderId AND r.status = :oldStatus
    """)
    int updateStatusBySalesOrderId(
        @Param("salesOrderId") Long salesOrderId,
        @Param("oldStatus") String oldStatus,
        @Param("newStatus") String newStatus
    );

    @Query("""
        SELECT r FROM StockReservation r
        WHERE r.variantId = :variantId AND r.warehouseId = :warehouseId AND r.status = 'BACKORDERED'
        ORDER BY r.createdAt ASC
    """)
    List<StockReservation> findBackorderedByVariantAndWarehouseOrderByCreatedAtAsc(
        @Param("variantId") Long variantId,
        @Param("warehouseId") Long warehouseId
    );
}
