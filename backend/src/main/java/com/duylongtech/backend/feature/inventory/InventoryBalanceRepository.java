package com.duylongtech.backend.feature.inventory;

import com.duylongtech.backend.feature.inventory.InventoryBalance;
import com.duylongtech.backend.feature.warehouse.WarehouseStockAiRow;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;
import com.duylongtech.backend.feature.assembly.DeviceComponentSerial;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.SerialNumber;
import com.duylongtech.backend.feature.warehouse.Warehouse;

public interface InventoryBalanceRepository extends JpaRepository<InventoryBalance, Long> {

  @org.springframework.data.jpa.repository.Modifying
  @Query("DELETE FROM InventoryBalance b WHERE b.variantId IN :variantIds")
  void deleteByVariantIdIn(@Param("variantIds") List<Long> variantIds);

  /**
   * Bulk-decrement quantityReserved for one (warehouse, variant, GOOD) row, clamped at 0 -
   * used by StockReservationExpiryJob to release many expired reservations without a
   * read-then-save round trip per reservation.
   */
  @org.springframework.data.jpa.repository.Modifying
  @Query("UPDATE InventoryBalance b SET b.quantityReserved = " +
      "CASE WHEN b.quantityReserved - :amount < 0 THEN 0 ELSE b.quantityReserved - :amount END " +
      "WHERE b.warehouseId = :warehouseId AND b.variantId = :variantId AND b.stockStatus = 'GOOD'")
  int decrementReservedQuantity(@Param("warehouseId") Long warehouseId, @Param("variantId") Long variantId,
      @Param("amount") java.math.BigDecimal amount);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT b FROM InventoryBalance b WHERE b.warehouseId = :warehouseId AND b.variantId = :variantId AND b.serialNumberId IS NULL AND b.lotBatchId IS NULL AND b.stockStatus = :stockStatus ORDER BY b.id ASC")
  List<InventoryBalance> findListByWarehouseAndVariantForUpdate(@Param("warehouseId") Long warehouseId,
      @Param("variantId") Long variantId, @Param("stockStatus") String stockStatus);

  default Optional<InventoryBalance> findByWarehouseAndVariantForUpdate(Long warehouseId, Long variantId, String stockStatus) {
    List<InventoryBalance> list = findListByWarehouseAndVariantForUpdate(warehouseId, variantId, stockStatus);
    return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
  }

  @Query("SELECT b FROM InventoryBalance b WHERE b.warehouseId = :warehouseId AND b.variantId = :variantId AND b.serialNumberId IS NULL AND b.lotBatchId IS NULL AND b.stockStatus = :stockStatus ORDER BY b.id ASC")
  List<InventoryBalance> findListByWarehouseAndVariant(@Param("warehouseId") Long warehouseId,
      @Param("variantId") Long variantId, @Param("stockStatus") String stockStatus);

  default Optional<InventoryBalance> findByWarehouseAndVariant(Long warehouseId, Long variantId, String stockStatus) {
    List<InventoryBalance> list = findListByWarehouseAndVariant(warehouseId, variantId, stockStatus);
    return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
  }

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT b FROM InventoryBalance b WHERE b.warehouseId = :warehouseId AND b.variantId = :variantId AND b.serialNumberId IS NULL AND b.lotBatchId IS NULL ORDER BY b.id ASC")
  List<InventoryBalance> findByWarehouseAndVariantForUpdate(@Param("warehouseId") Long warehouseId,
      @Param("variantId") Long variantId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT b FROM InventoryBalance b WHERE b.warehouseId = :warehouseId AND b.variantId = :variantId AND b.serialNumberId = :serialNumberId AND b.stockStatus = :stockStatus ORDER BY b.id ASC")
  List<InventoryBalance> findListByWarehouseVariantSerialForUpdate(@Param("warehouseId") Long warehouseId,
      @Param("variantId") Long variantId,
      @Param("serialNumberId") Long serialNumberId,
      @Param("stockStatus") String stockStatus);

  default Optional<InventoryBalance> findByWarehouseVariantSerialForUpdate(Long warehouseId, Long variantId, Long serialNumberId, String stockStatus) {
    List<InventoryBalance> list = findListByWarehouseVariantSerialForUpdate(warehouseId, variantId, serialNumberId, stockStatus);
    return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
  }

  @Query("SELECT b FROM InventoryBalance b WHERE b.warehouseId = :warehouseId AND b.variantId = :variantId AND b.serialNumberId = :serialNumberId AND b.stockStatus = :stockStatus ORDER BY b.id ASC")
  List<InventoryBalance> findListByWarehouseVariantSerial(@Param("warehouseId") Long warehouseId,
      @Param("variantId") Long variantId,
      @Param("serialNumberId") Long serialNumberId,
      @Param("stockStatus") String stockStatus);

  default Optional<InventoryBalance> findByWarehouseVariantSerial(Long warehouseId, Long variantId, Long serialNumberId, String stockStatus) {
    List<InventoryBalance> list = findListByWarehouseVariantSerial(warehouseId, variantId, serialNumberId, stockStatus);
    return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
  }

  boolean existsByWarehouseId(Long warehouseId);

  Optional<InventoryBalance> findFirstByWarehouseIdAndVariantIdAndStockStatus(Long warehouseId, Long variantId,
      String stockStatus);

  @Query("SELECT COALESCE(SUM(b.quantityOnHand), 0) FROM InventoryBalance b WHERE b.warehouseId = :warehouseId AND b.variantId = :variantId AND b.serialNumberId IS NULL")
  java.math.BigDecimal sumQuantityOnHandByWarehouseIdAndVariantId(@Param("warehouseId") Long warehouseId,
      @Param("variantId") Long variantId);

  @Query("SELECT COUNT(DISTINCT b.variantId) FROM InventoryBalance b WHERE b.warehouseId = :warehouseId")
  Long countDistinctVariantsByWarehouseId(@Param("warehouseId") Long warehouseId);

  @Query("SELECT COALESCE(SUM(b.quantityOnHand), 0) FROM InventoryBalance b WHERE b.warehouseId = :warehouseId AND b.serialNumberId IS NULL")
  java.math.BigDecimal sumQuantityOnHandByWarehouseId(@Param("warehouseId") Long warehouseId);

  @Query(value = "SELECT COALESCE(SUM(quantity_layered * unit_cost), 0) FROM inventory_cost_layers WHERE warehouse_id = :warehouseId", nativeQuery = true)
  java.math.BigDecimal sumTotalValueByWarehouseId(@Param("warehouseId") Long warehouseId);

  /**
   * Tồn bán được theo sản phẩm, cùng cách tính với cảnh báo sắp hết / hết hàng (ProductRepository.findStockLevels):
   * chỉ kho bán hàng (STANDARD), hàng GOOD; hàng quản lý serial đếm serial còn sẵn sàng, hàng thường đếm dòng tồn
   * không serial. Trước đây cộng dòng tồn tổng ở mọi kho nên màn Vật tư hàng hóa lệch với cảnh báo tồn.
   */
  @Query(value = """
      SELECT pv.product_id,
             COALESCE(SUM(CASE
                 WHEN COALESCE(p.track_serial, 0) = 1
                      AND ib.serial_number_id IS NOT NULL
                      AND sn.status = 'AVAILABLE' THEN ib.quantity_on_hand
                 WHEN COALESCE(p.track_serial, 0) = 0
                      AND ib.serial_number_id IS NULL THEN ib.quantity_on_hand
                 ELSE 0 END), 0)
      FROM inventory_balances ib
      JOIN product_variants pv ON pv.id = ib.variant_id
      JOIN products p ON p.id = pv.product_id
      LEFT JOIN serial_numbers sn ON sn.id = ib.serial_number_id
      WHERE pv.product_id IN (:productIds)
        AND ib.stock_status = 'GOOD'
        AND ib.warehouse_id IN (SELECT w.id FROM warehouses w WHERE w.type = 'STANDARD')
      GROUP BY pv.product_id
      """, nativeQuery = true)
  List<Object[]> sumSellableQuantityByProductIds(@Param("productIds") List<Long> productIds);

  @Query("""
      SELECT
          (
            COALESCE(SUM(CASE WHEN (
                (p.trackSerial = true AND b.serialNumberId IS NOT NULL AND sn.status = 'AVAILABLE' AND NOT EXISTS (
                    SELECT 1 FROM DeviceComponentSerial dcs
                    WHERE dcs.componentVariant.id = b.variantId
                      AND LOWER(dcs.componentSerial) = LOWER(sn.serialNumber)
                      AND (dcs.status IS NULL OR dcs.status = 'ACTIVE')
                ))
                OR ((p.trackSerial IS NULL OR p.trackSerial = false) AND b.serialNumberId IS NULL)
            ) THEN b.quantityOnHand ELSE 0 END), 0)
            -
            COALESCE(SUM(CASE WHEN b.serialNumberId IS NULL THEN b.quantityReserved ELSE 0 END), 0)
          )
      FROM InventoryBalance b
      JOIN ProductVariant v ON v.id = b.variantId
      JOIN v.product p
      LEFT JOIN SerialNumber sn ON sn.id = b.serialNumberId
      WHERE b.warehouseId = :warehouseId
        AND b.variantId = :variantId
        AND b.stockStatus = :stockStatus
        AND (
            (p.trackSerial = true)
            OR ((p.trackSerial IS NULL OR p.trackSerial = false) AND b.serialNumberId IS NULL)
        )
      """)
  java.math.BigDecimal sumAvailableQuantityByWarehouseAndVariant(@Param("warehouseId") Long warehouseId,
      @Param("variantId") Long variantId, @Param("stockStatus") String stockStatus);

  @Query("""
      SELECT
          (
            COALESCE(SUM(CASE WHEN (
                (p.trackSerial = true AND b.serialNumberId IS NOT NULL AND sn.status = 'AVAILABLE' AND NOT EXISTS (
                    SELECT 1 FROM DeviceComponentSerial dcs
                    WHERE dcs.componentVariant.id = b.variantId
                      AND LOWER(dcs.componentSerial) = LOWER(sn.serialNumber)
                      AND (dcs.status IS NULL OR dcs.status = 'ACTIVE')
                ))
                OR ((p.trackSerial IS NULL OR p.trackSerial = false) AND b.serialNumberId IS NULL)
            ) THEN b.quantityOnHand ELSE 0 END), 0)
            -
            COALESCE(SUM(CASE WHEN b.serialNumberId IS NULL THEN b.quantityReserved ELSE 0 END), 0)
          )
      FROM InventoryBalance b
      JOIN ProductVariant v ON v.id = b.variantId
      JOIN v.product p
      LEFT JOIN SerialNumber sn ON sn.id = b.serialNumberId
      WHERE b.warehouseId = :warehouseId
        AND b.variantId = :variantId
        AND b.stockStatus = :stockStatus
        AND (
            (p.trackSerial = true)
            OR ((p.trackSerial IS NULL OR p.trackSerial = false) AND b.serialNumberId IS NULL)
        )
      """)
  java.math.BigDecimal sumAvailableLooseQuantityByWarehouseAndVariant(@Param("warehouseId") Long warehouseId,
      @Param("variantId") Long variantId, @Param("stockStatus") String stockStatus);

  /**
   * Batched version of {@link #sumAvailableLooseQuantityByWarehouseAndVariant} - one query
   * for a whole set of variants (e.g. every component line on a repair) instead of one per
   * variant. Each row is [variantId, availableQty].
   */
  @Query("""
      SELECT v.id,
          (
            COALESCE(SUM(CASE WHEN (
                (p.trackSerial = true AND b.serialNumberId IS NOT NULL AND sn.status = 'AVAILABLE' AND NOT EXISTS (
                    SELECT 1 FROM DeviceComponentSerial dcs
                    WHERE dcs.componentVariant.id = b.variantId
                      AND LOWER(dcs.componentSerial) = LOWER(sn.serialNumber)
                      AND (dcs.status IS NULL OR dcs.status = 'ACTIVE')
                ))
                OR ((p.trackSerial IS NULL OR p.trackSerial = false) AND b.serialNumberId IS NULL)
            ) THEN b.quantityOnHand ELSE 0 END), 0)
            -
            COALESCE(SUM(CASE WHEN b.serialNumberId IS NULL THEN b.quantityReserved ELSE 0 END), 0)
          )
      FROM InventoryBalance b
      JOIN ProductVariant v ON v.id = b.variantId
      JOIN v.product p
      LEFT JOIN SerialNumber sn ON sn.id = b.serialNumberId
      WHERE b.warehouseId = :warehouseId
        AND b.variantId IN :variantIds
        AND b.stockStatus = :stockStatus
        AND (
            (p.trackSerial = true)
            OR ((p.trackSerial IS NULL OR p.trackSerial = false) AND b.serialNumberId IS NULL)
        )
      GROUP BY v.id
      """)
  List<Object[]> sumAvailableLooseQuantitiesGroupedByVariant(@Param("warehouseId") Long warehouseId,
      @Param("variantIds") List<Long> variantIds, @Param("stockStatus") String stockStatus);

  /**
   * Batched version of {@link #findByWarehouseVariantSerial} - fetches every matching balance
   * row for a set of (variant, serial) candidates in one query instead of one per line.
   */
  @Query("SELECT b FROM InventoryBalance b WHERE b.warehouseId = :warehouseId AND b.variantId IN :variantIds AND b.serialNumberId IN :serialNumberIds AND b.stockStatus = :stockStatus")
  List<InventoryBalance> findByWarehouseAndVariantInAndSerialNumberIn(@Param("warehouseId") Long warehouseId,
      @Param("variantIds") List<Long> variantIds, @Param("serialNumberIds") List<Long> serialNumberIds,
      @Param("stockStatus") String stockStatus);

  @Query("""
      SELECT
          v.id AS variantId,
          w.code AS warehouseCode,
          w.name AS warehouseName,
          p.productCode AS productCode,
          p.productName AS productName,
          v.sku AS sku,
          v.variantName AS variantName,
          COALESCE(SUM(CASE WHEN (
            (p.trackSerial = true AND b.serialNumberId IS NOT NULL AND sn.status = 'AVAILABLE' AND NOT EXISTS (
                SELECT 1 FROM DeviceComponentSerial dcs
                WHERE dcs.componentVariant.id = b.variantId
                  AND LOWER(dcs.componentSerial) = LOWER(sn.serialNumber)
                  AND (dcs.status IS NULL OR dcs.status = 'ACTIVE')
            ))
            OR ((p.trackSerial IS NULL OR p.trackSerial = false) AND b.serialNumberId IS NULL)
          ) THEN b.quantityOnHand ELSE 0 END), 0) AS quantityOnHand,
          COALESCE(SUM(CASE WHEN b.serialNumberId IS NULL THEN b.quantityReserved ELSE 0 END), 0) AS quantityReserved,
          (
            COALESCE(SUM(CASE WHEN (
              (p.trackSerial = true AND b.serialNumberId IS NOT NULL AND sn.status = 'AVAILABLE' AND NOT EXISTS (
                  SELECT 1 FROM DeviceComponentSerial dcs
                  WHERE dcs.componentVariant.id = b.variantId
                    AND LOWER(dcs.componentSerial) = LOWER(sn.serialNumber)
                    AND (dcs.status IS NULL OR dcs.status = 'ACTIVE')
              ))
              OR ((p.trackSerial IS NULL OR p.trackSerial = false) AND b.serialNumberId IS NULL)
            ) THEN b.quantityOnHand ELSE 0 END), 0)
            -
            COALESCE(SUM(CASE WHEN b.serialNumberId IS NULL THEN b.quantityReserved ELSE 0 END), 0)
          ) AS availableQuantity,
          COALESCE(SUM(CASE WHEN (
            (p.trackSerial = true AND b.serialNumberId IS NOT NULL AND sn.status = 'AVAILABLE' AND NOT EXISTS (
                SELECT 1 FROM DeviceComponentSerial dcs
                WHERE dcs.componentVariant.id = b.variantId
                  AND LOWER(dcs.componentSerial) = LOWER(sn.serialNumber)
                  AND (dcs.status IS NULL OR dcs.status = 'ACTIVE')
            ))
            OR ((p.trackSerial IS NULL OR p.trackSerial = false) AND b.serialNumberId IS NULL)
          ) THEN (b.quantityOnHand * b.averageCost) ELSE 0 END), 0) AS inventoryValue
      FROM InventoryBalance b
      JOIN Warehouse w ON w.id = b.warehouseId
      JOIN ProductVariant v ON v.id = b.variantId
      JOIN v.product p
      LEFT JOIN SerialNumber sn ON sn.id = b.serialNumberId
      WHERE b.warehouseId = :warehouseId
        AND b.stockStatus = 'GOOD'
        AND (
            (p.trackSerial = true)
            OR ((p.trackSerial IS NULL OR p.trackSerial = false) AND b.serialNumberId IS NULL)
        )
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
          COALESCE(SUM(CASE WHEN (
            (p.trackSerial = true AND b.serialNumberId IS NOT NULL AND sn.status = 'AVAILABLE' AND NOT EXISTS (
                SELECT 1 FROM DeviceComponentSerial dcs
                WHERE dcs.componentVariant.id = b.variantId
                  AND LOWER(dcs.componentSerial) = LOWER(sn.serialNumber)
                  AND (dcs.status IS NULL OR dcs.status = 'ACTIVE')
            ))
            OR ((p.trackSerial IS NULL OR p.trackSerial = false) AND b.serialNumberId IS NULL)
          ) THEN b.quantityOnHand ELSE 0 END), 0) AS quantityOnHand,
          COALESCE(SUM(CASE WHEN b.serialNumberId IS NULL THEN b.quantityReserved ELSE 0 END), 0) AS quantityReserved,
          (
            COALESCE(SUM(CASE WHEN (
              (p.trackSerial = true AND b.serialNumberId IS NOT NULL AND sn.status = 'AVAILABLE' AND NOT EXISTS (
                  SELECT 1 FROM DeviceComponentSerial dcs
                  WHERE dcs.componentVariant.id = b.variantId
                    AND LOWER(dcs.componentSerial) = LOWER(sn.serialNumber)
                    AND (dcs.status IS NULL OR dcs.status = 'ACTIVE')
              ))
              OR ((p.trackSerial IS NULL OR p.trackSerial = false) AND b.serialNumberId IS NULL)
            ) THEN b.quantityOnHand ELSE 0 END), 0)
            -
            COALESCE(SUM(CASE WHEN b.serialNumberId IS NULL THEN b.quantityReserved ELSE 0 END), 0)
          ) AS availableQuantity,
          COALESCE(SUM(CASE WHEN (
            (p.trackSerial = true AND b.serialNumberId IS NOT NULL AND sn.status = 'AVAILABLE' AND NOT EXISTS (
                SELECT 1 FROM DeviceComponentSerial dcs
                WHERE dcs.componentVariant.id = b.variantId
                  AND LOWER(dcs.componentSerial) = LOWER(sn.serialNumber)
                  AND (dcs.status IS NULL OR dcs.status = 'ACTIVE')
            ))
            OR ((p.trackSerial IS NULL OR p.trackSerial = false) AND b.serialNumberId IS NULL)
          ) THEN (b.quantityOnHand * b.averageCost) ELSE 0 END), 0) AS inventoryValue
      FROM InventoryBalance b
      JOIN Warehouse w ON w.id = b.warehouseId
      JOIN ProductVariant v ON v.id = b.variantId
      JOIN v.product p
      LEFT JOIN SerialNumber sn ON sn.id = b.serialNumberId
      WHERE b.stockStatus = 'GOOD'
        AND (
            (p.trackSerial = true)
            OR ((p.trackSerial IS NULL OR p.trackSerial = false) AND b.serialNumberId IS NULL)
        )
      GROUP BY v.id, w.code, w.name, p.productCode, p.productName, v.sku, v.variantName
      ORDER BY (
            COALESCE(SUM(CASE WHEN (
              (p.trackSerial = true AND b.serialNumberId IS NOT NULL AND sn.status = 'AVAILABLE' AND NOT EXISTS (
                  SELECT 1 FROM DeviceComponentSerial dcs
                  WHERE dcs.componentVariant.id = b.variantId
                    AND LOWER(dcs.componentSerial) = LOWER(sn.serialNumber)
                    AND (dcs.status IS NULL OR dcs.status = 'ACTIVE')
              ))
              OR ((p.trackSerial IS NULL OR p.trackSerial = false) AND b.serialNumberId IS NULL)
            ) THEN b.quantityOnHand ELSE 0 END), 0)
            -
            COALESCE(SUM(CASE WHEN b.serialNumberId IS NULL THEN b.quantityReserved ELSE 0 END), 0)
          ) ASC,
               COALESCE(SUM(b.quantityOnHand), 0) ASC
      """)
  List<WarehouseStockAiRow> findLowStockRowsForAi(Pageable pageable);
}
