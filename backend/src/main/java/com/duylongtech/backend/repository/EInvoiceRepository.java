package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.EInvoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface EInvoiceRepository extends JpaRepository<EInvoice, Long> {

    Optional<EInvoice> findBySalesOrderId(Long salesOrderId);

    List<EInvoice> findAllBySalesOrderId(Long salesOrderId);

    List<EInvoice> findAllBySalesOrderIdAndStatusNot(Long salesOrderId, String status);

    Optional<EInvoice> findFirstBySalesOrderIdAndInventoryDocumentIdIsNullAndStatusNot(Long salesOrderId, String status);

    List<EInvoice> findAllBySalesOrderIdAndInventoryDocumentIdIsNotNullAndStatusNot(Long salesOrderId, String status);

    Optional<EInvoice> findByInventoryDocumentId(Long inventoryDocumentId);

    Optional<EInvoice> findFirstByInventoryDocumentIdAndStatusNot(Long inventoryDocumentId, String status);

    List<EInvoice> findAllByInventoryDocumentId(Long inventoryDocumentId);

    Optional<EInvoice> findByTransactionUuid(String transactionUuid);

    Optional<EInvoice> findByInvoiceSeriesAndInvoiceNumber(String invoiceSeries, String invoiceNumber);

    @Query(
        value = "SELECT e FROM EInvoice e " +
                "LEFT JOIN FETCH e.partner p " +
                "LEFT JOIN FETCH e.salesOrder so " +
                "LEFT JOIN FETCH e.inventoryDocument inv " +
                "LEFT JOIN FETCH e.createdByUser u " +
                "WHERE (:keyword IS NULL OR :keyword = '' OR " +
                "   LOWER(COALESCE(e.invoiceNumber, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                "   LOWER(COALESCE(e.invoiceSeries, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                "   LOWER(COALESCE(e.buyerName, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                "   LOWER(COALESCE(e.buyerLegalName, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                "   LOWER(COALESCE(e.buyerTaxCode, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                "   LOWER(COALESCE(so.soCode, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                "   LOWER(COALESCE(inv.docCode, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                "   LOWER(COALESCE(e.transactionUuid, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
                "(:status IS NULL OR :status = '' OR e.status = :status) AND " +
                "(:fromDate IS NULL OR e.invoiceDate >= :fromDate) AND " +
                "(:toDate IS NULL OR e.invoiceDate <= :toDate) AND " +
                "(:partnerId IS NULL OR e.partnerId = :partnerId)",
        countQuery = "SELECT COUNT(e) FROM EInvoice e " +
                     "LEFT JOIN e.salesOrder so " +
                     "LEFT JOIN e.inventoryDocument inv " +
                     "WHERE (:keyword IS NULL OR :keyword = '' OR " +
                     "   LOWER(COALESCE(e.invoiceNumber, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                     "   LOWER(COALESCE(e.invoiceSeries, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                     "   LOWER(COALESCE(e.buyerName, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                     "   LOWER(COALESCE(e.buyerLegalName, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                     "   LOWER(COALESCE(e.buyerTaxCode, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                     "   LOWER(COALESCE(so.soCode, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                     "   LOWER(COALESCE(inv.docCode, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                     "   LOWER(COALESCE(e.transactionUuid, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
                     "(:status IS NULL OR :status = '' OR e.status = :status) AND " +
                     "(:fromDate IS NULL OR e.invoiceDate >= :fromDate) AND " +
                     "(:toDate IS NULL OR e.invoiceDate <= :toDate) AND " +
                     "(:partnerId IS NULL OR e.partnerId = :partnerId)"
    )
    Page<EInvoice> searchInvoices(
            @Param("keyword") String keyword,
            @Param("status") String status,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("partnerId") Long partnerId,
            Pageable pageable
    );

    @Query("SELECT COUNT(e) FROM EInvoice e WHERE e.invoiceSeries = :series")
    long countByInvoiceSeries(@Param("series") String series);
}
