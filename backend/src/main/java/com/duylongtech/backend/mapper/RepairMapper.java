package com.duylongtech.backend.mapper;

import com.duylongtech.backend.dto.response.RepairFeeResponse;
import com.duylongtech.backend.dto.response.RepairLineResponse;
import com.duylongtech.backend.dto.response.RepairResponse;
import com.duylongtech.backend.entity.Repair;
import com.duylongtech.backend.entity.RepairFee;
import com.duylongtech.backend.entity.RepairLine;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface RepairMapper {

    RepairResponse toResponse(Repair repair);

    @Mapping(target = "repairId", source = "repair.id")
    RepairLineResponse toLineResponse(RepairLine line);

    @Mapping(target = "repairId", source = "repair.id")
    RepairFeeResponse toFeeResponse(RepairFee fee);
}
