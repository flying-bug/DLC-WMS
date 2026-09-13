package com.duylongtech.backend.feature.product;

import com.duylongtech.backend.feature.product.ProductUnitConversion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductUnitConversionRepository extends JpaRepository<ProductUnitConversion, Long> {
    List<ProductUnitConversion> findByProductId(Long productId);
    void deleteByProductId(Long productId);
}
