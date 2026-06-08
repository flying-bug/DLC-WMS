package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.InventoryDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface InventoryDocumentRepository extends JpaRepository<InventoryDocument, Long> {

    @Query("SELECT DISTINCT e FROM InventoryDocument e LEFT JOIN FETCH e.lines l WHERE e.docType = 'EX_SO' AND (:docCode IS NULL OR LOWER(e.docCode) LIKE LOWER(CONCAT('%',:docCode,'%'))) AND (:warehouseId IS NULL OR e.warehouseId = :warehouseId) AND (:status IS NULL OR e.status = :status) AND (:fromDate IS NULL OR e.docDate >= :fromDate) AND (:toDate IS NULL OR e.docDate <= :toDate) ORDER BY e.docDate DESC")
    List<InventoryDocument> searchExports(@Param("docCode") String docCode,
                                         @Param("fromDate") LocalDate fromDate,
                                         @Param("toDate") LocalDate toDate,
                                         @Param("status") String status,
                                         @Param("warehouseId") Long warehouseId);

    @Query("SELECT DISTINCT e FROM InventoryDocument e LEFT JOIN FETCH e.lines l WHERE e.docType = 'EX_SO' ORDER BY e.docDate DESC")
    List<InventoryDocument> findAllExports();
}
