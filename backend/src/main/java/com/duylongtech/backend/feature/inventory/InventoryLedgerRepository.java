package com.duylongtech.backend.feature.inventory;

import com.duylongtech.backend.feature.inventory.InventoryLedger;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InventoryLedgerRepository extends JpaRepository<InventoryLedger, Long> {
    boolean existsByVariantIdIn(List<Long> variantIds);
}
