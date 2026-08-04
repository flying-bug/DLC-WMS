package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.InventoryDocumentLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InventoryDocumentLineRepository extends JpaRepository<InventoryDocumentLine, Long> {
    boolean existsByVariantIdIn(List<Long> variantIds);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(l) > 0 FROM InventoryDocumentLine l WHERE l.serialNumberId = :serialId AND l.inventoryDocument.status IN ('DRAFT', 'SUBMITTED') AND (:excludeDocId IS NULL OR l.inventoryDocument.id <> :excludeDocId) AND l.inventoryDocument.docType = 'EX_SO'")
    boolean isSerialLockedInDrafts(@org.springframework.data.repository.query.Param("serialId") Long serialId, @org.springframework.data.repository.query.Param("excludeDocId") Long excludeDocId);
}
