package com.duylongtech.backend.feature.product;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ProductUnitConversionRepository extends JpaRepository<ProductUnitConversion, Long> {
    @Query("""
            SELECT conversion
            FROM ProductUnitConversion conversion
            JOIN FETCH conversion.unit
            WHERE conversion.product.id = :productId
            ORDER BY conversion.id
            """)
    List<ProductUnitConversion> findByProductId(@Param("productId") Long productId);

    @Query("""
            SELECT conversion
            FROM ProductUnitConversion conversion
            JOIN FETCH conversion.unit
            WHERE conversion.product.id IN :productIds
            ORDER BY conversion.product.id, conversion.id
            """)
    List<ProductUnitConversion> findAllWithUnitByProductIdIn(@Param("productIds") Collection<Long> productIds);

    void deleteByProductId(Long productId);
}
