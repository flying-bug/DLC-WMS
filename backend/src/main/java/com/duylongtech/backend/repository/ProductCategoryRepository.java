package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.ProductCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProductCategoryRepository extends JpaRepository<ProductCategory, Long> {
    Optional<ProductCategory> findByCode(String code);

    Optional<ProductCategory> findByName(String name);

    boolean existsByCode(String code);

    boolean existsByName(String name);

    Page<ProductCategory> findByNameContainingIgnoreCaseOrCodeContainingIgnoreCase(
            String name,
            String code,
            Pageable pageable
    );


}
