package com.duylongtech.backend.feature.warehouse;

import com.duylongtech.backend.feature.warehouse.Warehouse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface WarehouseRepository extends JpaRepository<Warehouse, Long> {

    Optional<Warehouse> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    java.util.List<Warehouse> findByStatus(String status);
    
    Optional<Warehouse> findFirstByTypeAndStatus(String type, String status);

    @Query("SELECT w FROM Warehouse w WHERE " +
           "LOWER(w.code) LIKE LOWER(CONCAT('%', TRIM(:search), '%')) OR " +
           "LOWER(w.name) LIKE LOWER(CONCAT('%', TRIM(:search), '%'))")
    Page<Warehouse> searchByCodeOrName(@Param("search") String search, Pageable pageable);



    @Query("SELECT w FROM Warehouse w WHERE " +
           "(:search IS NULL OR :search = '' OR LOWER(w.code) LIKE LOWER(CONCAT('%', TRIM(:search), '%')) OR LOWER(w.name) LIKE LOWER(CONCAT('%', TRIM(:search), '%')) OR LOWER(w.address) LIKE LOWER(CONCAT('%', TRIM(:search), '%'))) AND " +
           "(:status IS NULL OR :status = '' OR w.status = :status)")
    Page<Warehouse> searchWarehouses(@Param("search") String search, 
                                     @Param("status") String status, 
                                     Pageable pageable);
}
