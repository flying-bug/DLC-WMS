package com.duylongtech.backend.feature.inventory;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface InventoryCostAllocationRepository extends JpaRepository<InventoryCostAllocation, Long> {
    @Query("SELECT COUNT(a) > 0 FROM InventoryCostAllocation a WHERE a.inventoryDocumentLineId IN :lineIds AND a.status IN ('HOLDING', 'CONSUMED')")
    boolean existsActiveByLineIds(@Param("lineIds") Collection<Long> lineIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM InventoryCostAllocation a WHERE a.inventoryDocumentLineId = :lineId AND a.status = :status ORDER BY a.id")
    List<InventoryCostAllocation> findByLineAndStatusForUpdate(@Param("lineId") Long lineId,
                                                               @Param("status") String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM InventoryCostAllocation a WHERE a.inventoryDocumentLineId IN :lineIds AND a.status = :status ORDER BY a.id")
    List<InventoryCostAllocation> findByLinesAndStatusForUpdate(@Param("lineIds") Collection<Long> lineIds,
                                                                @Param("status") String status);
}
