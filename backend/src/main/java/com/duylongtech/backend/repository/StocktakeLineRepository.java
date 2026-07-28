package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.StocktakeLine;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StocktakeLineRepository extends JpaRepository<StocktakeLine, Long> {
}
