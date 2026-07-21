package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.InventoryDocumentLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InventoryDocumentLineRepository extends JpaRepository<InventoryDocumentLine, Long> {
    boolean existsByVariantIdIn(List<Long> variantIds);
}
