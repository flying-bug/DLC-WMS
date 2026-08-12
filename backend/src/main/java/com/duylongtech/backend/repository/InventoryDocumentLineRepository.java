package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.InventoryDocumentLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface InventoryDocumentLineRepository extends JpaRepository<InventoryDocumentLine, Long> {
    boolean existsByVariantIdIn(List<Long> variantIds);

    @Query("SELECT COUNT(l) > 0 FROM InventoryDocumentLine l WHERE l.serialNumberId = :serialId AND l.inventoryDocument.status IN ('DRAFT', 'SUBMITTED') AND (:excludeDocId IS NULL OR l.inventoryDocument.id <> :excludeDocId) AND l.inventoryDocument.docType = 'EX_SO'")
    boolean isSerialLockedInDrafts(@Param("serialId") Long serialId, @Param("excludeDocId") Long excludeDocId);

    @Query("SELECT COALESCE(SUM(l.quantityOut), 0) FROM InventoryDocumentLine l WHERE l.inventoryDocument.salesOrderId = :salesOrderId AND l.variantId = :variantId AND (l.inventoryDocument.status IS NULL OR l.inventoryDocument.status <> 'CANCELLED') AND (:excludeDocId IS NULL OR l.inventoryDocument.id <> :excludeDocId)")
    BigDecimal sumExportedQuantityBySalesOrderIdAndVariantIdExcludingDoc(@Param("salesOrderId") Long salesOrderId, @Param("variantId") Long variantId, @Param("excludeDocId") Long excludeDocId);

    @Query("SELECT COALESCE(SUM(l.quantityOut), 0) FROM InventoryDocumentLine l WHERE l.inventoryDocument.salesOrderId = :salesOrderId AND l.variantId = :variantId AND (l.inventoryDocument.status IS NULL OR l.inventoryDocument.status <> 'CANCELLED')")
    BigDecimal sumExportedQuantityBySalesOrderIdAndVariantId(@Param("salesOrderId") Long salesOrderId, @Param("variantId") Long variantId);

    @Query("SELECT COALESCE(SUM(l.quantityIn), 0) FROM InventoryDocumentLine l WHERE l.inventoryDocument.purchaseOrderId = :purchaseOrderId AND l.variantId = :variantId AND (l.inventoryDocument.status IS NULL OR l.inventoryDocument.status <> 'CANCELLED') AND (:excludeDocId IS NULL OR l.inventoryDocument.id <> :excludeDocId)")
    BigDecimal sumImportedQuantityByPurchaseOrderIdAndVariantIdExcludingDoc(@Param("purchaseOrderId") Long purchaseOrderId, @Param("variantId") Long variantId, @Param("excludeDocId") Long excludeDocId);

    @Query("SELECT COALESCE(SUM(l.quantityIn), 0) FROM InventoryDocumentLine l WHERE l.inventoryDocument.purchaseOrderId = :purchaseOrderId AND l.variantId = :variantId AND (l.inventoryDocument.status IS NULL OR l.inventoryDocument.status <> 'CANCELLED')")
    BigDecimal sumImportedQuantityByPurchaseOrderIdAndVariantId(@Param("purchaseOrderId") Long purchaseOrderId, @Param("variantId") Long variantId);
}
