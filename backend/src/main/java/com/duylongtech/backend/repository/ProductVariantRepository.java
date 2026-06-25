package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.ProductVariant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {
    Optional<ProductVariant> findBySku(String sku);

    List<ProductVariant> findByProductIdOrderByIdAsc(Long productId);

    long countByProductId(Long productId);

    @Query(value = "SELECT v FROM ProductVariant v " +
            "JOIN FETCH v.product p " +
            "LEFT JOIN FETCH p.brand " +
            "LEFT JOIN FETCH p.category " +
            "LEFT JOIN FETCH p.unit " +
            "WHERE (:search IS NULL OR :search = '' " +
            "OR LOWER(v.sku) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(v.variantName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(p.productCode) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(p.productName) LIKE LOWER(CONCAT('%', :search, '%')))",
            countQuery = "SELECT COUNT(v) FROM ProductVariant v JOIN v.product p " +
                    "WHERE (:search IS NULL OR :search = '' " +
                    "OR LOWER(v.sku) LIKE LOWER(CONCAT('%', :search, '%')) " +
                    "OR LOWER(v.variantName) LIKE LOWER(CONCAT('%', :search, '%')) " +
                    "OR LOWER(p.productCode) LIKE LOWER(CONCAT('%', :search, '%')) " +
                    "OR LOWER(p.productName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<ProductVariant> searchVariants(@Param("search") String search, Pageable pageable);
}
