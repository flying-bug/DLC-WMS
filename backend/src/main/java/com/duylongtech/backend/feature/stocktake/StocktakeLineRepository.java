package com.duylongtech.backend.feature.stocktake;

import com.duylongtech.backend.feature.stocktake.StocktakeLine;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StocktakeLineRepository extends JpaRepository<StocktakeLine, Long> {
}
