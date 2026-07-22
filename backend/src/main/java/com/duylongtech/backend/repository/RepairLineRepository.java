package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.RepairLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RepairLineRepository extends JpaRepository<RepairLine, Long> {
    List<RepairLine> findByRepairId(Long repairId);
    void deleteByRepairId(Long repairId);
}
