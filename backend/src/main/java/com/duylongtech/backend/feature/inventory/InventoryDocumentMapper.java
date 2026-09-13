package com.duylongtech.backend.feature.inventory;

import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineResponse;
import com.duylongtech.backend.feature.inventory.InventoryDocumentResponse;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLine;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface InventoryDocumentMapper {

    InventoryDocumentResponse toResponse(InventoryDocument doc);

    InventoryDocumentLineResponse toLineResponse(InventoryDocumentLine line);

    InventoryDocumentLine toLineEntity(InventoryDocumentLineRequest req);
}
