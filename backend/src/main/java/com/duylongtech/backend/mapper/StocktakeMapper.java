package com.duylongtech.backend.mapper;

import com.duylongtech.backend.dto.response.StocktakeLineResponse;
import com.duylongtech.backend.dto.response.StocktakeLineSerialResponse;
import com.duylongtech.backend.dto.response.StocktakeParticipantResponse;
import com.duylongtech.backend.dto.response.StocktakeResponse;
import com.duylongtech.backend.entity.Stocktake;
import com.duylongtech.backend.entity.StocktakeLine;
import com.duylongtech.backend.entity.StocktakeLineSerial;
import com.duylongtech.backend.entity.StocktakeParticipant;
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
