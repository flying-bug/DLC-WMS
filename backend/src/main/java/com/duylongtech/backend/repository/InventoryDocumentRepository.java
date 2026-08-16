package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.InventoryDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface InventoryDocumentRepository extends JpaRepository<InventoryDocument, Long> {

    @Query("SELECT DISTINCT e FROM InventoryDocument e LEFT JOIN FETCH e.lines l WHERE e.docType = 'EX_SO' AND (e.issuePurpose IS NULL OR e.issuePurpose != 'TRANSFER_EXPORT') AND (:keyword IS NULL OR (LOWER(e.docCode) LIKE LOWER(CONCAT('%',:keyword,'%')) OR EXISTS (SELECT 1 FROM InventoryDocumentLine line LEFT JOIN ProductVariant pv ON line.variantId = pv.id WHERE line.inventoryDocument = e AND (LOWER(line.serialNumbersText) LIKE LOWER(CONCAT('%',:keyword,'%')) OR LOWER(pv.barcode) LIKE LOWER(CONCAT('%',:keyword,'%')) OR LOWER(pv.sku) LIKE LOWER(CONCAT('%',:keyword,'%')))))) AND (:warehouseId IS NULL OR e.warehouseId = :warehouseId) AND (:status IS NULL OR e.status = :status) AND (:issuePurpose IS NULL OR e.issuePurpose = :issuePurpose) AND (:referenceType IS NULL OR e.referenceType = :referenceType) AND (:referenceId IS NULL OR e.referenceId = :referenceId) AND (:partnerId IS NULL OR e.partnerId = :partnerId) AND (:salespersonId IS NULL OR e.salespersonId = :salespersonId) AND (:fromDate IS NULL OR e.docDate >= :fromDate) AND (:toDate IS NULL OR e.docDate <= :toDate) ORDER BY e.updatedAt DESC, e.id DESC")
    List<InventoryDocument> searchExports(@Param("keyword") String keyword,
                                         @Param("fromDate") LocalDate fromDate,
                                         @Param("toDate") LocalDate toDate,
                                         @Param("status") String status,
                                         @Param("warehouseId") Long warehouseId,
                                         @Param("issuePurpose") String issuePurpose,
                                         @Param("referenceType") String referenceType,
                                         @Param("referenceId") Long referenceId,
                                         @Param("partnerId") Long partnerId,
                                         @Param("salespersonId") Long salespersonId);

    @Query("SELECT DISTINCT e FROM InventoryDocument e LEFT JOIN FETCH e.lines l WHERE e.docType = 'EX_SO' AND (e.issuePurpose IS NULL OR e.issuePurpose != 'TRANSFER_EXPORT') ORDER BY e.updatedAt DESC, e.id DESC")
    List<InventoryDocument> findAllExports();

    @Query("SELECT DISTINCT e FROM InventoryDocument e LEFT JOIN FETCH e.lines l WHERE e.id = :id AND e.docType = 'EX_SO'")
    Optional<InventoryDocument> findExportByIdWithLines(@Param("id") Long id);

    @Query("SELECT DISTINCT e FROM InventoryDocument e LEFT JOIN FETCH e.lines l WHERE e.docType = 'IN_PO' AND (e.issuePurpose IS NULL OR e.issuePurpose != 'TRANSFER_IMPORT') AND (:keyword IS NULL OR (LOWER(e.docCode) LIKE LOWER(CONCAT('%',:keyword,'%')) OR EXISTS (SELECT 1 FROM InventoryDocumentLine line LEFT JOIN ProductVariant pv ON line.variantId = pv.id WHERE line.inventoryDocument = e AND (LOWER(line.serialNumbersText) LIKE LOWER(CONCAT('%',:keyword,'%')) OR LOWER(pv.barcode) LIKE LOWER(CONCAT('%',:keyword,'%')) OR LOWER(pv.sku) LIKE LOWER(CONCAT('%',:keyword,'%')))))) AND (:warehouseId IS NULL OR e.warehouseId = :warehouseId) AND (:status IS NULL OR e.status = :status) AND (:issuePurpose IS NULL OR e.issuePurpose = :issuePurpose) AND (:referenceType IS NULL OR e.referenceType = :referenceType) AND (:referenceId IS NULL OR e.referenceId = :referenceId) AND (:partnerId IS NULL OR e.partnerId = :partnerId) AND (:salespersonId IS NULL OR e.salespersonId = :salespersonId) AND (:fromDate IS NULL OR e.docDate >= :fromDate) AND (:toDate IS NULL OR e.docDate <= :toDate) ORDER BY e.updatedAt DESC, e.id DESC")
    List<InventoryDocument> searchImports(@Param("keyword") String keyword,
                                          @Param("fromDate") LocalDate fromDate,
                                          @Param("toDate") LocalDate toDate,
                                          @Param("status") String status,
                                          @Param("warehouseId") Long warehouseId,
                                          @Param("issuePurpose") String issuePurpose,
                                          @Param("referenceType") String referenceType,
                                          @Param("referenceId") Long referenceId,
                                          @Param("partnerId") Long partnerId,
                                          @Param("salespersonId") Long salespersonId);

    @Query("SELECT DISTINCT e FROM InventoryDocument e LEFT JOIN FETCH e.lines l WHERE e.docType = 'IN_PO' AND (e.issuePurpose IS NULL OR e.issuePurpose != 'TRANSFER_IMPORT') ORDER BY e.updatedAt DESC, e.id DESC")
    List<InventoryDocument> findAllImports();

    @Query("SELECT DISTINCT e FROM InventoryDocument e LEFT JOIN FETCH e.lines l WHERE e.id = :id AND e.docType = 'IN_PO'")
    Optional<InventoryDocument> findImportByIdWithLines(@Param("id") Long id);

    boolean existsByDocCode(String docCode);

    boolean existsByDocCodeAndIdNot(String docCode, Long id);

    Optional<InventoryDocument> findTopByDocCodeStartingWithOrderByDocCodeDesc(String prefix);

    @Query(value = "SELECT doc_code FROM inventory_documents WHERE doc_code REGEXP '^XK[0-9]+$' ORDER BY CAST(SUBSTRING(doc_code, 3) AS UNSIGNED) ASC", nativeQuery = true)
    java.util.List<String> findAllExportDocCodes();

    @Query(value = "SELECT doc_code FROM inventory_documents WHERE doc_code REGEXP '^NK[0-9]+$' ORDER BY CAST(SUBSTRING(doc_code, 3) AS UNSIGNED) ASC", nativeQuery = true)
    java.util.List<String> findAllImportDocCodes();

    @Query("SELECT CASE WHEN COUNT(e) > 0 THEN true ELSE false END FROM InventoryDocument e WHERE e.warehouseId = :warehouseId OR e.sourceWarehouseId = :warehouseId")
    boolean existsByAnyWarehouseId(@Param("warehouseId") Long warehouseId);

    boolean existsByCreatedByAndWarehouseIdAndStatusIn(Long createdBy, Long warehouseId, List<String> statuses);

    boolean existsByReferenceTypeAndReferenceId(String referenceType, Long referenceId);

    Optional<InventoryDocument> findByDocCode(String docCode);

    @Query("SELECT d FROM InventoryDocument d LEFT JOIN FETCH d.lines WHERE d.referenceRepairId = :repairId ORDER BY d.createdAt DESC")
    List<InventoryDocument> findByReferenceRepairId(@Param("repairId") Long repairId);
}

