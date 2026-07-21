package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.InventoryCostLayer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.List;

public interface InventoryCostLayerRepository extends JpaRepository<InventoryCostLayer, Long> {

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM InventoryCostLayer c WHERE c.variantId IN :variantIds")
    void deleteByVariantIdIn(@Param("variantIds") List<Long> variantIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM InventoryCostLayer c WHERE c.warehouseId = :warehouseId AND c.variantId = :variantId AND c.quantityLayered > 0 ORDER BY c.createdAt ASC")
    List<InventoryCostLayer> findAvailableLayersForUpdate(@Param("warehouseId") Long warehouseId, @Param("variantId") Long variantId);
}
