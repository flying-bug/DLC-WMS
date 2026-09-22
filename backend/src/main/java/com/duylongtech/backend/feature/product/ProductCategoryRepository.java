package com.duylongtech.backend.feature.product;

import com.duylongtech.backend.feature.product.ProductCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Query("SELECT c FROM ProductCategory c WHERE (:search IS NULL " +
           "OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(c.code) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:status IS NULL OR c.status = :status)")
    Page<ProductCategory> search(@Param("search") String search, @Param("status") String status, Pageable pageable);


}
