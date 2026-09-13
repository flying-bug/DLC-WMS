package com.duylongtech.backend.feature.repair;

import com.duylongtech.backend.feature.repair.RepairFee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RepairFeeRepository extends JpaRepository<RepairFee, Long> {

    List<RepairFee> findByRepairId(Long repairId);

    void deleteByRepairId(Long repairId);
}
