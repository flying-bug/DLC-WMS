package com.duylongtech.backend.feature.repair;

import com.duylongtech.backend.feature.repair.RepairLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RepairLineRepository extends JpaRepository<RepairLine, Long> {
    List<RepairLine> findByRepairId(Long repairId);
    List<RepairLine> findByRepairIdAndActionType(Long repairId, String actionType);  // ADD THIS
    void deleteByRepairId(Long repairId);
}
