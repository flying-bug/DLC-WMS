package com.duylongtech.backend.mapper;

import com.duylongtech.backend.dto.request.InventoryDocumentLineRequest;
import com.duylongtech.backend.dto.response.InventoryDocumentLineResponse;
import com.duylongtech.backend.dto.response.InventoryDocumentResponse;
import com.duylongtech.backend.entity.InventoryDocument;
import com.duylongtech.backend.entity.InventoryDocumentLine;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface InventoryDocumentMapper {

    InventoryDocumentResponse toResponse(InventoryDocument doc);

    InventoryDocumentLineResponse toLineResponse(InventoryDocumentLine line);

    InventoryDocumentLine toLineEntity(InventoryDocumentLineRequest req);
}
