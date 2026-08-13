package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.InventoryBalance;
import com.duylongtech.backend.dto.response.WarehouseStockAiRow;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface InventoryBalanceRepository extends JpaRepository<InventoryBalance, Long> {

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM InventoryBalance b WHERE b.variantId IN :variantIds")
    void deleteByVariantIdIn(@Param("variantIds") List<Long> variantIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM InventoryBalance b WHERE b.warehouseId = :warehouseId AND b.variantId = :variantId AND b.serialNumberId IS NULL AND b.lotBatchId IS NULL AND b.stockStatus = :stockStatus")
    Optional<InventoryBalance> findByWarehouseAndVariantForUpdate(@Param("warehouseId") Long warehouseId, @Param("variantId") Long variantId, @Param("stockStatus") String stockStatus);

    @Query("SELECT b FROM InventoryBalance b WHERE b.warehouseId = :warehouseId AND b.variantId = :variantId AND b.serialNumberId IS NULL AND b.lotBatchId IS NULL AND b.stockStatus = :stockStatus")
    Optional<InventoryBalance> findByWarehouseAndVariant(@Param("warehouseId") Long warehouseId, @Param("variantId") Long variantId, @Param("stockStatus") String stockStatus);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM InventoryBalance b WHERE b.warehouseId = :warehouseId AND b.variantId = :variantId AND b.serialNumberId IS NULL AND b.lotBatchId IS NULL")
    List<InventoryBalance> findByWarehouseAndVariantForUpdate(@Param("warehouseId") Long warehouseId, @Param("variantId") Long variantId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM InventoryBalance b WHERE b.warehouseId = :warehouseId AND b.variantId = :variantId AND b.serialNumberId = :serialNumberId AND b.stockStatus = :stockStatus")
    Optional<InventoryBalance> findByWarehouseVariantSerialForUpdate(@Param("warehouseId") Long warehouseId,
                                                                     @Param("variantId") Long variantId,
                                                                     @Param("serialNumberId") Long serialNumberId,
                                                                     @Param("stockStatus") String stockStatus);

    @Query("SELECT b FROM InventoryBalance b WHERE b.warehouseId = :warehouseId AND b.variantId = :variantId AND b.serialNumberId = :serialNumberId AND b.stockStatus = :stockStatus")
    Optional<InventoryBalance> findByWarehouseVariantSerial(@Param("warehouseId") Long warehouseId,
                                                            @Param("variantId") Long variantId,
                                                            @Param("serialNumberId") Long serialNumberId,
                                                            @Param("stockStatus") String stockStatus);

    boolean existsByWarehouseId(Long warehouseId);

    Optional<InventoryBalance> findFirstByWarehouseIdAndVariantIdAndStockStatus(Long warehouseId, Long variantId, String stockStatus);

    @Query("SELECT COUNT(DISTINCT b.variantId) FROM InventoryBalance b WHERE b.warehouseId = :warehouseId")
    Long countDistinctVariantsByWarehouseId(@Param("warehouseId") Long warehouseId);

    @Query("SELECT COALESCE(SUM(b.quantityOnHand), 0) FROM InventoryBalance b WHERE b.warehouseId = :warehouseId AND b.serialNumberId IS NULL")
    java.math.BigDecimal sumQuantityOnHandByWarehouseId(@Param("warehouseId") Long warehouseId);

    @Query("SELECT COALESCE(SUM(b.quantityOnHand * b.averageCost), 0) FROM InventoryBalance b WHERE b.warehouseId = :warehouseId AND b.serialNumberId IS NULL")
    java.math.BigDecimal sumTotalValueByWarehouseId(@Param("warehouseId") Long warehouseId);

    @Query("SELECT v.product.id, COALESCE(SUM(b.quantityOnHand), 0) FROM InventoryBalance b JOIN ProductVariant v ON v.id = b.variantId WHERE v.product.id IN :productIds AND b.serialNumberId IS NULL GROUP BY v.product.id")
    List<Object[]> sumQuantityOnHandByProductIds(@Param("productIds") List<Long> productIds);

    @Query("SELECT COALESCE(SUM(b.quantityOnHand - b.quantityReserved), 0) FROM InventoryBalance b WHERE b.warehouseId = :warehouseId AND b.variantId = :variantId AND b.stockStatus = :stockStatus AND b.serialNumberId IS NULL")
    java.math.BigDecimal sumAvailableQuantityByWarehouseAndVariant(@Param("warehouseId") Long warehouseId, @Param("variantId") Long variantId, @Param("stockStatus") String stockStatus);

    @Query("""
            SELECT COALESCE(SUM(b.quantityOnHand - b.quantityReserved), 0)
            FROM InventoryBalance b
            JOIN ProductVariant v ON v.id = b.variantId
            JOIN v.product p
            LEFT JOIN SerialNumber sn ON sn.id = b.serialNumberId
            WHERE b.warehouseId = :warehouseId
              AND b.variantId = :variantId
              AND b.stockStatus = :stockStatus
              AND (
                  (
                      p.trackSerial = true
                      AND b.serialNumberId IS NOT NULL
                      AND sn.status = 'AVAILABLE'
                      AND NOT EXISTS (
                          SELECT 1 FROM DeviceComponentSerial dcs
                          WHERE dcs.componentVariant.id = b.variantId
                            AND LOWER(dcs.componentSerial) = LOWER(sn.serialNumber)
                            AND (dcs.status IS NULL OR dcs.status = 'ACTIVE')
                      )
                  )
                  OR ((p.trackSerial IS NULL OR p.trackSerial = false) AND b.serialNumberId IS NULL)
              )
            """)
    java.math.BigDecimal sumAvailableLooseQuantityByWarehouseAndVariant(@Param("warehouseId") Long warehouseId, @Param("variantId") Long variantId, @Param("stockStatus") String stockStatus);


    @Query("""
            SELECT
                v.id AS variantId,
                w.code AS warehouseCode,
                w.name AS warehouseName,
                p.productCode AS productCode,
                p.productName AS productName,
                v.sku AS sku,
                v.variantName AS variantName,
                COALESCE(SUM(b.quantityOnHand), 0) AS quantityOnHand,
                COALESCE(SUM(b.quantityReserved), 0) AS quantityReserved,
                COALESCE(SUM(b.quantityOnHand - b.quantityReserved), 0) AS availableQuantity,
                COALESCE(SUM(b.quantityOnHand * b.averageCost), 0) AS inventoryValue
            FROM InventoryBalance b
            JOIN Warehouse w ON w.id = b.warehouseId
            JOIN ProductVariant v ON v.id = b.variantId
            JOIN v.product p
            WHERE b.warehouseId = :warehouseId
              AND b.serialNumberId IS NULL
            GROUP BY v.id, w.code, w.name, p.productCode, p.productName, v.sku, v.variantName
            ORDER BY COALESCE(SUM(b.quantityOnHand), 0) DESC
            """)
    List<WarehouseStockAiRow> findStockRowsForAiByWarehouseId(@Param("warehouseId") Long warehouseId);

    @Query("""
            SELECT
                v.id AS variantId,
                w.code AS warehouseCode,
                w.name AS warehouseName,
                p.productCode AS productCode,
                p.productName AS productName,
                v.sku AS sku,
                v.variantName AS variantName,
                COALESCE(SUM(b.quantityOnHand), 0) AS quantityOnHand,
                COALESCE(SUM(b.quantityReserved), 0) AS quantityReserved,
                COALESCE(SUM(b.quantityOnHand - b.quantityReserved), 0) AS availableQuantity,
                COALESCE(SUM(b.quantityOnHand * b.averageCost), 0) AS inventoryValue
            FROM InventoryBalance b
            JOIN Warehouse w ON w.id = b.warehouseId
            JOIN ProductVariant v ON v.id = b.variantId
            JOIN v.product p
            WHERE b.serialNumberId IS NULL
            GROUP BY v.id, w.code, w.name, p.productCode, p.productName, v.sku, v.variantName
            ORDER BY COALESCE(SUM(b.quantityOnHand - b.quantityReserved), 0) ASC,
                     COALESCE(SUM(b.quantityOnHand), 0) ASC
            """)
    List<WarehouseStockAiRow> findLowStockRowsForAi(Pageable pageable);
}
