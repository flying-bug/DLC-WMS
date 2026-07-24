package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.ProductUnitConversion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductUnitConversionRepository extends JpaRepository<ProductUnitConversion, Long> {
    List<ProductUnitConversion> findByProductId(Long productId);
    void deleteByProductId(Long productId);
}
