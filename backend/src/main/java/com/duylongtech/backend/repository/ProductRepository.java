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

    @Query(value = """
            SELECT
                COALESCE(SUM(CASE
                    WHEN stock_summary.stock_qty > 0
                     AND stock_summary.min_stock_qty > 0
                     AND stock_summary.stock_qty <= stock_summary.min_stock_qty
                    THEN 1 ELSE 0 END), 0) AS low_stock_count,
                COALESCE(SUM(CASE
                    WHEN stock_summary.stock_qty <= 0
                    THEN 1 ELSE 0 END), 0) AS out_of_stock_count
            FROM (
                SELECT
                    p.id,
                    COALESCE(p.min_stock_qty, 0) AS min_stock_qty,
                    COALESCE(SUM(CASE
                        WHEN ib.serial_number_id IS NULL THEN ib.quantity_on_hand
                        ELSE 0 END), 0) AS stock_qty
                FROM products p
                LEFT JOIN product_variants pv
                    ON pv.product_id = p.id
                   AND pv.active = TRUE
                LEFT JOIN inventory_balances ib
                    ON ib.variant_id = pv.id
                WHERE p.active = TRUE
                  AND LOWER(TRIM(p.product_type)) NOT IN ('dịch vụ', 'dich vu', 'service')
                GROUP BY p.id, p.min_stock_qty
            ) stock_summary
            """, nativeQuery = true)
    Object[] getStockAlertSummary();

    boolean existsByCategoryId(Long categoryId);
}
