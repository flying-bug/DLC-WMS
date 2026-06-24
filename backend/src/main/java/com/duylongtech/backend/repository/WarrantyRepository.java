package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.Warranty;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WarrantyRepository extends JpaRepository<Warranty, Long> {
    boolean existsByWarrantyCode(String warrantyCode);

    boolean existsByWarrantyCodeAndIdNot(String warrantyCode, Long id);
    
    @Query("SELECT w FROM Warranty w " +
           "LEFT JOIN FETCH w.serialNumber sn " +
           "WHERE w.partnerId = :customerId " +
           "ORDER BY w.startDate DESC")
    Page<Warranty> findWarrantiesByCustomerId(@Param("customerId") Long customerId, Pageable pageable);
}
