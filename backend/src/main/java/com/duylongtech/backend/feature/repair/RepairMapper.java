package com.duylongtech.backend.feature.repair;

import com.duylongtech.backend.feature.repair.RepairFeeResponse;
import com.duylongtech.backend.feature.repair.RepairLineResponse;
import com.duylongtech.backend.feature.repair.RepairResponse;
import com.duylongtech.backend.feature.repair.Repair;
import com.duylongtech.backend.feature.repair.RepairFee;
import com.duylongtech.backend.feature.repair.RepairLine;
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
