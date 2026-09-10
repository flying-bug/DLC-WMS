package com.duylongtech.backend.mapper;

import com.duylongtech.backend.dto.StockTransferLineDTO;
import com.duylongtech.backend.dto.StockTransferResponseDTO;
import com.duylongtech.backend.entity.StockTransfer;
import com.duylongtech.backend.entity.StockTransferLine;
import org.mapstruct.Mapper;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface StockTransferMapper {

    StockTransferResponseDTO toResponse(StockTransfer transfer);

    StockTransferLineDTO toLineDTO(StockTransferLine line);
}
