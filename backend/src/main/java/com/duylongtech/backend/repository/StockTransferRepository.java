package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.StockTransfer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StockTransferRepository extends JpaRepository<StockTransfer, Long> {
    Optional<StockTransfer> findByTransferCode(String transferCode);

    @Query("SELECT DISTINCT t FROM StockTransfer t LEFT JOIN FETCH t.lines l WHERE " +
           "(:transferCode IS NULL OR LOWER(t.transferCode) LIKE LOWER(CONCAT('%',:transferCode,'%'))) AND " +
           "(:status IS NULL OR t.status = :status) AND " +
           "(:fromDate IS NULL OR t.transferDate >= :fromDate) AND " +
           "(:toDate IS NULL OR t.transferDate <= :toDate) " +
           "ORDER BY t.transferDate DESC")
    List<StockTransfer> searchTransfers(@Param("transferCode") String transferCode,
                                        @Param("fromDate") LocalDate fromDate,
                                        @Param("toDate") LocalDate toDate,
                                        @Param("status") String status);

    @Query("SELECT DISTINCT t FROM StockTransfer t LEFT JOIN FETCH t.lines l ORDER BY t.transferDate DESC")
    List<StockTransfer> findAllTransfers();

    @Query("SELECT DISTINCT t FROM StockTransfer t LEFT JOIN FETCH t.lines l WHERE t.id = :id")
    Optional<StockTransfer> findByIdWithLines(@Param("id") Long id);
}
