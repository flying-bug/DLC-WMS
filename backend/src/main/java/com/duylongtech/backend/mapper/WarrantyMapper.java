package com.duylongtech.backend.mapper;

import com.duylongtech.backend.dto.response.WarrantyLineResponse;
import com.duylongtech.backend.dto.response.WarrantyResponse;
import com.duylongtech.backend.entity.Warranty;
import com.duylongtech.backend.entity.WarrantyLine;
import org.mapstruct.Mapper;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface WarrantyMapper {
    WarrantyResponse toResponse(Warranty warranty);
    
    @org.mapstruct.Mapping(target = "serialNumber", ignore = true)
    WarrantyLineResponse toLineResponse(WarrantyLine line);
}
