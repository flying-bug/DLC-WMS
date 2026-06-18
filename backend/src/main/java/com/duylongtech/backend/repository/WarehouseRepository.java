package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.Warehouse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface WarehouseRepository extends JpaRepository<Warehouse, Long> {

    Optional<Warehouse> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    @Query("SELECT w FROM Warehouse w WHERE " +
           "LOWER(w.code) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Warehouse> searchByCodeOrName(@Param("search") String search, Pageable pageable);

    @Query("SELECT w FROM Warehouse w WHERE " +
           "(:code IS NULL OR :code = '' OR LOWER(w.code) LIKE LOWER(CONCAT('%', :code, '%'))) AND " +
           "(:name IS NULL OR :name = '' OR LOWER(w.name) LIKE LOWER(CONCAT('%', :name, '%'))) AND " +
           "(:address IS NULL OR :address = '' OR LOWER(w.address) LIKE LOWER(CONCAT('%', :address, '%'))) AND " +
           "(:status IS NULL OR :status = '' OR w.status = :status)")
    Page<Warehouse> filterWarehouses(@Param("code") String code,
                                     @Param("name") String name,
                                     @Param("address") String address,
                                     @Param("status") String status,
                                     Pageable pageable);
}
