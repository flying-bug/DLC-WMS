package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.InventoryDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface InventoryDocumentRepository extends JpaRepository<InventoryDocument, Long> {

    @Query("SELECT DISTINCT e FROM InventoryDocument e LEFT JOIN FETCH e.lines l WHERE e.docType = 'EX_SO' AND (e.issuePurpose IS NULL OR e.issuePurpose != 'TRANSFER_EXPORT') AND (:docCode IS NULL OR LOWER(e.docCode) LIKE LOWER(CONCAT('%',:docCode,'%'))) AND (:warehouseId IS NULL OR e.warehouseId = :warehouseId) AND (:status IS NULL OR e.status = :status) AND (:issuePurpose IS NULL OR e.issuePurpose = :issuePurpose) AND (:referenceType IS NULL OR e.referenceType = :referenceType) AND (:referenceId IS NULL OR e.referenceId = :referenceId) AND (:fromDate IS NULL OR e.docDate >= :fromDate) AND (:toDate IS NULL OR e.docDate <= :toDate) ORDER BY e.updatedAt DESC, e.id DESC")
    List<InventoryDocument> searchExports(@Param("docCode") String docCode,
                                         @Param("fromDate") LocalDate fromDate,
                                         @Param("toDate") LocalDate toDate,
                                         @Param("status") String status,
                                         @Param("warehouseId") Long warehouseId,
                                         @Param("issuePurpose") String issuePurpose,
                                         @Param("referenceType") String referenceType,
                                         @Param("referenceId") Long referenceId);

    @Query("SELECT DISTINCT e FROM InventoryDocument e LEFT JOIN FETCH e.lines l WHERE e.docType = 'EX_SO' AND (e.issuePurpose IS NULL OR e.issuePurpose != 'TRANSFER_EXPORT') ORDER BY e.updatedAt DESC, e.id DESC")
    List<InventoryDocument> findAllExports();

    @Query("SELECT DISTINCT e FROM InventoryDocument e LEFT JOIN FETCH e.lines l WHERE e.id = :id AND e.docType = 'EX_SO'")
    Optional<InventoryDocument> findExportByIdWithLines(@Param("id") Long id);

    @Query("SELECT DISTINCT e FROM InventoryDocument e LEFT JOIN FETCH e.lines l WHERE e.docType = 'IN_PO' AND (e.issuePurpose IS NULL OR e.issuePurpose != 'TRANSFER_IMPORT') AND (:docCode IS NULL OR LOWER(e.docCode) LIKE LOWER(CONCAT('%',:docCode,'%'))) AND (:warehouseId IS NULL OR e.warehouseId = :warehouseId) AND (:status IS NULL OR e.status = :status) AND (:fromDate IS NULL OR e.docDate >= :fromDate) AND (:toDate IS NULL OR e.docDate <= :toDate) ORDER BY e.updatedAt DESC, e.id DESC")
    List<InventoryDocument> searchImports(@Param("docCode") String docCode,
                                         @Param("fromDate") LocalDate fromDate,
                                         @Param("toDate") LocalDate toDate,
                                         @Param("status") String status,
                                         @Param("warehouseId") Long warehouseId);

    @Query("SELECT DISTINCT e FROM InventoryDocument e LEFT JOIN FETCH e.lines l WHERE e.docType = 'IN_PO' AND (e.issuePurpose IS NULL OR e.issuePurpose != 'TRANSFER_IMPORT') ORDER BY e.updatedAt DESC, e.id DESC")
    List<InventoryDocument> findAllImports();

    @Query("SELECT DISTINCT e FROM InventoryDocument e LEFT JOIN FETCH e.lines l WHERE e.id = :id AND e.docType = 'IN_PO'")
    Optional<InventoryDocument> findImportByIdWithLines(@Param("id") Long id);

    boolean existsByDocCode(String docCode);

    boolean existsByDocCodeAndIdNot(String docCode, Long id);

    Optional<InventoryDocument> findTopByDocCodeStartingWithOrderByDocCodeDesc(String prefix);

    @Query("SELECT CASE WHEN COUNT(e) > 0 THEN true ELSE false END FROM InventoryDocument e WHERE e.warehouseId = :warehouseId OR e.sourceWarehouseId = :warehouseId")
    boolean existsByAnyWarehouseId(@Param("warehouseId") Long warehouseId);

    boolean existsByCreatedByAndWarehouseIdAndStatusIn(Long createdBy, Long warehouseId, List<String> statuses);

    boolean existsByReferenceTypeAndReferenceId(String referenceType, Long referenceId);

    Optional<InventoryDocument> findByDocCode(String docCode);

    @Query("SELECT d FROM InventoryDocument d LEFT JOIN FETCH d.lines WHERE d.referenceRepairId = :repairId ORDER BY d.createdAt DESC")
    List<InventoryDocument> findByReferenceRepairId(@Param("repairId") Long repairId);
}

