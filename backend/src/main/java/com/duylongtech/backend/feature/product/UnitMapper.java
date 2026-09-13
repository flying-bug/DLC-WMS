package com.duylongtech.backend.feature.product;

import com.duylongtech.backend.feature.product.UnitRequest;
import com.duylongtech.backend.feature.product.UnitResponse;
import com.duylongtech.backend.feature.product.Unit;
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
