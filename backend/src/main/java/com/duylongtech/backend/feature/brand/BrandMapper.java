package com.duylongtech.backend.feature.brand;

import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface BrandMapper {

    BrandResponse toResponse(Brand brand);

    Brand toEntity(BrandRequest request);

}
