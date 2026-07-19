package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.Repair;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface RepairRepository extends JpaRepository<Repair, Long> {
    List<Repair> findByWarrantyId(Long warrantyId);

    boolean existsByRepairCode(String repairCode);

    boolean existsByRepairCodeAndIdNot(String repairCode, Long id);

    @Query("""
            SELECT r FROM Repair r
            WHERE (:status IS NULL OR r.repairStatus = :status)
              AND (:fromDate IS NULL OR r.receivedDate >= :fromDate)
              AND (:toDate IS NULL OR r.receivedDate <= :toDate)
              AND (
                :keyword IS NULL
                OR LOWER(r.repairCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
              )
            ORDER BY r.receivedDate DESC
            """)
    Page<Repair> searchRepairTickets(@Param("keyword") String keyword,
                                     @Param("status") String status,
                                     @Param("fromDate") LocalDate fromDate,
                                     @Param("toDate") LocalDate toDate,
                                     Pageable pageable);

    @Query("SELECT MAX(r.repairCode) FROM Repair r WHERE r.repairCode LIKE 'SC-%'")
    String findMaxRepairCode();
}
