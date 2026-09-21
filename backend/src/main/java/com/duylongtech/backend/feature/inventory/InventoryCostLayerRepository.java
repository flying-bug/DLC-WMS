package com.duylongtech.backend.feature.inventory;

import com.duylongtech.backend.feature.inventory.InventoryCostLayer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface InventoryCostLayerRepository extends JpaRepository<InventoryCostLayer, Long> {

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM InventoryCostLayer c WHERE c.variantId IN :variantIds")
    void deleteByVariantIdIn(@Param("variantIds") List<Long> variantIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM InventoryCostLayer c WHERE c.warehouseId = :warehouseId AND c.variantId = :variantId AND c.quantityLayered > 0 ORDER BY c.createdAt ASC, c.id ASC")
    List<InventoryCostLayer> findAvailableLayersForUpdate(@Param("warehouseId") Long warehouseId, @Param("variantId") Long variantId);

    // Lấy tất cả lớp FIFO còn tồn của một variant (mọi kho), sắp xếp từ cũ đến mới
    @Query("SELECT c FROM InventoryCostLayer c WHERE c.variantId = :variantId AND c.quantityLayered > c.quantityReserved ORDER BY c.createdAt ASC, c.id ASC")
    List<InventoryCostLayer> findAvailableLayersByVariant(@Param("variantId") Long variantId);

    @Query("SELECT c FROM InventoryCostLayer c WHERE c.variantId IN :variantIds AND c.quantityLayered > c.quantityReserved ORDER BY c.createdAt ASC, c.id ASC")
    List<InventoryCostLayer> findAvailableLayersByVariants(@Param("variantIds") List<Long> variantIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM InventoryCostLayer c WHERE c.inventoryDocumentLineId = :lineId ORDER BY c.id")
    List<InventoryCostLayer> findByInventoryDocumentLineId(@Param("lineId") Long inventoryDocumentLineId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM InventoryCostLayer c WHERE c.id = :id")
    Optional<InventoryCostLayer> findByIdForUpdate(@Param("id") Long id);
}
