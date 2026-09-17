package com.duylongtech.backend.feature.repair;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RepairPhotoRepository extends JpaRepository<RepairPhoto, Long> {

    List<RepairPhoto> findByRepairIdOrderByCreatedAtAsc(Long repairId);

    List<RepairPhoto> findByRepairIdAndPhaseOrderByCreatedAtAsc(Long repairId, String phase);

    long countByRepairIdAndPhase(Long repairId, String phase);

    Optional<RepairPhoto> findByIdAndRepairId(Long id, Long repairId);

    @Query("SELECT p FROM RepairPhoto p WHERE p.repairId = :repairId AND p.phase = :phase AND p.locked = false")
    List<RepairPhoto> findUnlockedByRepairIdAndPhase(@Param("repairId") Long repairId, @Param("phase") String phase);

    void deleteByRepairId(Long repairId);
}
