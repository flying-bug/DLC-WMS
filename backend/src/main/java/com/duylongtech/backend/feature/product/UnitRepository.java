package com.duylongtech.backend.feature.product;

import com.duylongtech.backend.feature.product.Unit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UnitRepository extends JpaRepository<Unit, Long> {
    Optional<Unit> findByName(String name);
    Page<Unit> findByNameContainingIgnoreCase(String name, Pageable pageable);

    @Query("SELECT u FROM Unit u WHERE (:search IS NULL OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:status IS NULL OR u.status = :status)")
    Page<Unit> search(@Param("search") String search, @Param("status") String status, Pageable pageable);
}
