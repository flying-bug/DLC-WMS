package com.duylongtech.backend.mapper;

import com.duylongtech.backend.dto.request.BrandRequest;
import com.duylongtech.backend.dto.response.BrandResponse;
import com.duylongtech.backend.entity.Brand;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface BrandMapper {

    BrandResponse toResponse(Brand brand);

    Brand toEntity(BrandRequest request);

    void updateEntity(@MappingTarget Brand brand, BrandRequest request);
}
