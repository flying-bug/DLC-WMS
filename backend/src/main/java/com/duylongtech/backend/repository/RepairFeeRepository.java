package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.RepairFee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RepairFeeRepository extends JpaRepository<RepairFee, Long> {
    List<RepairFee> findByRepairId(Long repairId);
}
