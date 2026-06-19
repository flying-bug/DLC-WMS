package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.InventoryBalance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.Optional;

public interface InventoryBalanceRepository extends JpaRepository<InventoryBalance, Long> {
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM InventoryBalance b WHERE b.warehouseId = :warehouseId AND b.variantId = :variantId AND b.stockStatus = :stockStatus")
    Optional<InventoryBalance> findByWarehouseAndVariantForUpdate(@Param("warehouseId") Long warehouseId, @Param("variantId") Long variantId, @Param("stockStatus") String stockStatus);

    boolean existsByWarehouseId(Long warehouseId);

    @Query("SELECT COUNT(DISTINCT b.variantId) FROM InventoryBalance b WHERE b.warehouseId = :warehouseId")
    Long countDistinctVariantsByWarehouseId(@Param("warehouseId") Long warehouseId);

    @Query("SELECT COALESCE(SUM(b.quantityOnHand), 0) FROM InventoryBalance b WHERE b.warehouseId = :warehouseId")
    java.math.BigDecimal sumQuantityOnHandByWarehouseId(@Param("warehouseId") Long warehouseId);

    @Query("SELECT COALESCE(SUM(b.quantityOnHand * b.averageCost), 0) FROM InventoryBalance b WHERE b.warehouseId = :warehouseId")
    java.math.BigDecimal sumTotalValueByWarehouseId(@Param("warehouseId") Long warehouseId);
}
