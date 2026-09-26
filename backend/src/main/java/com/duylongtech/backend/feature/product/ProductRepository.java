package com.duylongtech.backend.feature.product;

import com.duylongtech.backend.feature.product.Product;
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

    @Query("""
            SELECT p
            FROM Product p
            LEFT JOIN FETCH p.brand
            LEFT JOIN FETCH p.category
            LEFT JOIN FETCH p.unit
            WHERE p.id = :id
            """)
    Optional<Product> findDetailsById(@Param("id") Long id);

    @Query(value = "SELECT p FROM Product p LEFT JOIN FETCH p.brand LEFT JOIN FETCH p.category LEFT JOIN FETCH p.unit " +
           "WHERE (:search IS NULL OR LOWER(p.productName) LIKE LOWER(CONCAT('%', TRIM(:search), '%')) " +
           "OR LOWER(p.productCode) LIKE LOWER(CONCAT('%', TRIM(:search), '%'))) " +
           "AND (:categoryId IS NULL OR p.category.id = :categoryId) " +
           "AND (:productType IS NULL OR p.productType = :productType) " +
           "AND (:brandId IS NULL OR p.brand.id = :brandId) " +
           "AND (:unitId IS NULL OR p.unit.id = :unitId)",
           countQuery = "SELECT count(p) FROM Product p " +
           "WHERE (:search IS NULL OR LOWER(p.productName) LIKE LOWER(CONCAT('%', TRIM(:search), '%')) " +
           "OR LOWER(p.productCode) LIKE LOWER(CONCAT('%', TRIM(:search), '%'))) " +
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

    /** Tồn bán được của một mã hàng (biến thể) đang kinh doanh. */
    public interface StockLevelProjection {
        Long getProductId();
        Long getVariantId();
        String getSku();
        String getProductName();
        String getVariantName();
        String getProductType();
        String getUnitName();
        java.math.BigDecimal getMinStockQty();
        java.math.BigDecimal getStockQty();
    }

    /*
     * Nguồn duy nhất cho cảnh báo sắp hết / hết hàng (màn Tổng quan và Vật tư hàng hóa cùng dùng):
     * - theo từng mã hàng (biến thể), ngưỡng là "Tồn tối thiểu" của biến thể;
     * - chỉ tính tồn ở kho bán hàng (STANDARD): hàng nằm trong kho phế liệu không được coi là còn hàng;
     * - hàng quản lý serial đếm các serial còn sẵn sàng, hàng thường đếm dòng tồn không serial.
     */
    @Query(value = """
            SELECT
                p.id AS productId,
                pv.id AS variantId,
                pv.sku AS sku,
                p.product_name AS productName,
                pv.variant_name AS variantName,
                p.product_type AS productType,
                u.name AS unitName,
                COALESCE(pv.min_stock_qty, 0) AS minStockQty,
                COALESCE(SUM(CASE
                    WHEN COALESCE(p.track_serial, 0) = 1
                         AND ib.serial_number_id IS NOT NULL
                         AND sn.status = 'AVAILABLE' THEN ib.quantity_on_hand
                    WHEN COALESCE(p.track_serial, 0) = 0
                         AND ib.serial_number_id IS NULL THEN ib.quantity_on_hand
                    ELSE 0 END), 0) AS stockQty
            FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
            LEFT JOIN units u ON u.id = p.unit_id
            LEFT JOIN inventory_balances ib
                ON ib.variant_id = pv.id
                AND ib.stock_status = 'GOOD'
                AND ib.warehouse_id IN (SELECT w.id FROM warehouses w WHERE w.type = 'STANDARD')
            LEFT JOIN serial_numbers sn ON sn.id = ib.serial_number_id
            WHERE p.active = TRUE
              AND pv.active = TRUE
              AND LOWER(TRIM(p.product_type)) NOT IN ('dịch vụ', 'dich vu', 'service')
            GROUP BY p.id, pv.id, pv.sku, p.product_name, pv.variant_name, p.product_type, u.name, pv.min_stock_qty
            """, nativeQuery = true)
    java.util.List<StockLevelProjection> findStockLevels();

    boolean existsByCategoryId(Long categoryId);
}
