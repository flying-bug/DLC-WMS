package com.duylongtech.backend.feature.warehouse;

import com.duylongtech.backend.feature.warehouse.StockTransfer;
import com.duylongtech.backend.feature.warehouse.StockTransferLine;
import org.mapstruct.Mapper;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface StockTransferMapper {

    StockTransferResponseDTO toResponse(StockTransfer transfer);

    StockTransferLineDTO toLineDTO(StockTransferLine line);
}
