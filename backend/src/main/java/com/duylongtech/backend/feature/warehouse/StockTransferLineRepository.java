package com.duylongtech.backend.feature.warehouse;

import com.duylongtech.backend.feature.warehouse.StockTransferLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockTransferLineRepository extends JpaRepository<StockTransferLine, Long> {
    boolean existsByVariantIdIn(List<Long> variantIds);
}
