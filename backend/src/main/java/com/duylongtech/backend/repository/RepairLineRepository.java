package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.RepairLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RepairLineRepository extends JpaRepository<RepairLine, Long> {

    List<RepairLine> findByRepairId(Long repairId);

    @Query("SELECT rl FROM RepairLine rl WHERE rl.repair.id = :repairId AND rl.actionType = :actionType")
    List<RepairLine> findByRepairIdAndActionType(@Param("repairId") Long repairId, @Param("actionType") String actionType);

    void deleteByRepairId(Long repairId);
}
