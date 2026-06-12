package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.InventoryLedger;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryLedgerRepository extends JpaRepository<InventoryLedger, Long> {
}
