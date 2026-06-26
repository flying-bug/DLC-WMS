package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.Repair;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RepairRepository extends JpaRepository<Repair, Long> {
    List<Repair> findByWarrantyId(Long warrantyId);

    boolean existsByRepairCode(String repairCode);

    boolean existsByRepairCodeAndIdNot(String repairCode, Long id);

    @EntityGraph(attributePaths = {"warranty", "warranty.partner", "warranty.serialNumber", "warranty.serialNumber.variant"})
    @Query("""
            SELECT r FROM Repair r
            LEFT JOIN r.warranty w
            LEFT JOIN w.partner p
            LEFT JOIN w.serialNumber sn
            LEFT JOIN sn.variant pv
            WHERE (:status IS NULL OR r.repairStatus = :status)
              AND (:fromDate IS NULL OR r.receivedDate >= :fromDate)
              AND (:toDate IS NULL OR r.receivedDate <= :toDate)
              AND (
                :keyword IS NULL
                OR LOWER(r.repairCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(w.warrantyCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(p.phone) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(sn.serialNumber) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(pv.sku) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(pv.variantName) LIKE LOWER(CONCAT('%', :keyword, '%'))
              )
            ORDER BY r.receivedDate DESC
            """)
    Page<Repair> searchRepairTickets(@Param("keyword") String keyword,
                                     @Param("status") String status,
                                     @Param("fromDate") LocalDate fromDate,
                                     @Param("toDate") LocalDate toDate,
                                     Pageable pageable);

    @EntityGraph(attributePaths = {"warranty", "warranty.partner", "warranty.serialNumber", "warranty.serialNumber.variant"})
    @Query("SELECT r FROM Repair r WHERE r.id = :id")
    Optional<Repair> findWithDetailsById(@Param("id") Long id);
}
