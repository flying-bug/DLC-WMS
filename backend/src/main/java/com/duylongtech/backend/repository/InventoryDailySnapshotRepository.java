package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.InventoryDailySnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryDailySnapshotRepository extends JpaRepository<InventoryDailySnapshot, Long> {

    Optional<InventoryDailySnapshot> findBySnapshotDateAndWarehouseIdAndVariantId(
            LocalDate snapshotDate, Long warehouseId, Long variantId);

    List<InventoryDailySnapshot> findBySnapshotDate(LocalDate snapshotDate);

    @Query("SELECT COUNT(s), COALESCE(SUM(s.closingQuantity), 0), COALESCE(SUM(s.closingValue), 0) FROM InventoryDailySnapshot s WHERE s.snapshotDate = :snapshotDate")
    List<Object[]> getSummaryByDate(@Param("snapshotDate") LocalDate snapshotDate);

    @Modifying
    @Query(value = "INSERT INTO inventory_daily_snapshots (snapshot_date, warehouse_id, variant_id, closing_quantity, closing_value, created_at, updated_at) " +
            "SELECT :snapshotDate, l.warehouse_id, l.variant_id, " +
            "COALESCE(SUM(l.quantity_in - l.quantity_out), 0), " +
            "COALESCE(SUM((l.quantity_in * l.unit_cost) - (l.quantity_out * l.unit_cost)), 0), " +
            "NOW(), NOW() " +
            "FROM inventory_ledger l " +
            "WHERE l.movement_at <= :endOfDay " +
            "GROUP BY l.warehouse_id, l.variant_id " +
            "ON DUPLICATE KEY UPDATE " +
            "closing_quantity = VALUES(closing_quantity), " +
            "closing_value = VALUES(closing_value), " +
            "updated_at = NOW()", nativeQuery = true)
    void upsertDailySnapshotForDate(@Param("snapshotDate") LocalDate snapshotDate, 
                                   @Param("endOfDay") java.time.LocalDateTime endOfDay);
}
