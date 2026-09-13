package com.duylongtech.backend.feature.product;

import com.duylongtech.backend.feature.product.Unit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UnitRepository extends JpaRepository<Unit, Long> {
    Optional<Unit> findByName(String name);
    Page<Unit> findByNameContainingIgnoreCase(String name, Pageable pageable);
}
