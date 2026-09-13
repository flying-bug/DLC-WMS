package com.duylongtech.backend.feature.stocktake;

import com.duylongtech.backend.feature.stocktake.StocktakeParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StocktakeParticipantRepository extends JpaRepository<StocktakeParticipant, Long> {
}
