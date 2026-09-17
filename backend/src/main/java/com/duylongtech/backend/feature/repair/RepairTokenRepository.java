package com.duylongtech.backend.feature.repair;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RepairTokenRepository extends JpaRepository<RepairToken, Long> {
    Optional<RepairToken> findByToken(String token);
    List<RepairToken> findByRepairIdAndStatus(Long repairId, String status);
}
