package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.RepairLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RepairLineRepository extends JpaRepository<RepairLine, Long> {
    List<RepairLine> findByRepairId(Long repairId);
}
