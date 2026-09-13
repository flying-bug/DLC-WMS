package com.duylongtech.backend.feature.warranty;

import com.duylongtech.backend.feature.warranty.WarrantyLineResponse;
import com.duylongtech.backend.feature.warranty.WarrantyResponse;
import com.duylongtech.backend.feature.warranty.Warranty;
import com.duylongtech.backend.feature.warranty.WarrantyLine;
import org.mapstruct.Mapper;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;
import com.duylongtech.backend.feature.product.SerialNumber;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface WarrantyMapper {
    WarrantyResponse toResponse(Warranty warranty);
    
    @org.mapstruct.Mapping(target = "serialNumber", ignore = true)
    WarrantyLineResponse toLineResponse(WarrantyLine line);
}
