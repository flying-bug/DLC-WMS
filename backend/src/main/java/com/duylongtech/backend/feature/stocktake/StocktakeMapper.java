package com.duylongtech.backend.feature.stocktake;

import com.duylongtech.backend.feature.stocktake.StocktakeLineResponse;
import com.duylongtech.backend.feature.stocktake.StocktakeLineSerialResponse;
import com.duylongtech.backend.feature.stocktake.StocktakeParticipantResponse;
import com.duylongtech.backend.feature.stocktake.StocktakeResponse;
import com.duylongtech.backend.feature.stocktake.Stocktake;
import com.duylongtech.backend.feature.stocktake.StocktakeLine;
import com.duylongtech.backend.feature.stocktake.StocktakeLineSerial;
import com.duylongtech.backend.feature.stocktake.StocktakeParticipant;
import org.mapstruct.Mapper;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface StocktakeMapper {
    StocktakeResponse toResponse(Stocktake stocktake);
    StocktakeLineResponse toLineResponse(StocktakeLine line);
    StocktakeLineSerialResponse toSerialResponse(StocktakeLineSerial serial);
    StocktakeParticipantResponse toParticipantResponse(StocktakeParticipant participant);
}
