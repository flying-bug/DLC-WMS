package com.duylongtech.backend.mapper;

import com.duylongtech.backend.dto.response.WarehouseResponse;
import com.duylongtech.backend.entity.Warehouse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface WarehouseMapper {

    @Mapping(source = "creator.id", target = "creatorId")
    @Mapping(source = "creator.fullName", target = "creatorName")
    @Mapping(source = "updater.id", target = "updaterId")
    @Mapping(source = "updater.fullName", target = "updaterName")
    WarehouseResponse toResponse(Warehouse warehouse);
}
