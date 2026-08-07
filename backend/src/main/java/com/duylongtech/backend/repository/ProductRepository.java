package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findByProductCode(String productCode);

    @Query(value = "SELECT p FROM Product p LEFT JOIN FETCH p.brand LEFT JOIN FETCH p.category LEFT JOIN FETCH p.unit " +
           "WHERE (:search IS NULL OR LOWER(p.productName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(p.productCode) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:categoryId IS NULL OR p.category.id = :categoryId) " +
           "AND (:productType IS NULL OR p.productType = :productType) " +
           "AND (:brandId IS NULL OR p.brand.id = :brandId) " +
           "AND (:unitId IS NULL OR p.unit.id = :unitId)",
           countQuery = "SELECT count(p) FROM Product p " +
           "WHERE (:search IS NULL OR LOWER(p.productName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(p.productCode) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:categoryId IS NULL OR p.category.id = :categoryId) " +
           "AND (:productType IS NULL OR p.productType = :productType) " +
           "AND (:brandId IS NULL OR p.brand.id = :brandId) " +
           "AND (:unitId IS NULL OR p.unit.id = :unitId)")
    Page<Product> searchProducts(@Param("search") String search, 
                                 @Param("categoryId") Long categoryId, 
                                 @Param("productType") String productType,
                                 @Param("brandId") Long brandId,
                                 @Param("unitId") Long unitId,
                                 Pageable pageable);

    boolean existsByCategoryId(Long categoryId);
}
