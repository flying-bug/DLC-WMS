package com.duylongtech.backend.mapper;

import com.duylongtech.backend.dto.request.UnitRequest;
import com.duylongtech.backend.dto.response.UnitResponse;
import com.duylongtech.backend.entity.Unit;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface UnitMapper {

    UnitResponse toResponse(Unit unit);

    Unit toEntity(UnitRequest request);

    void updateEntity(@MappingTarget Unit unit, UnitRequest request);
}
