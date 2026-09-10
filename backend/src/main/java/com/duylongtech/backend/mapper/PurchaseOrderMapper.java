package com.duylongtech.backend.mapper;

import com.duylongtech.backend.dto.request.PurchaseOrderRequest.PurchaseOrderLineRequest;
import com.duylongtech.backend.dto.response.PurchaseOrderResponse;
import com.duylongtech.backend.dto.response.PurchaseOrderResponse.PurchaseOrderLineResponse;
import com.duylongtech.backend.entity.PurchaseOrder;
import com.duylongtech.backend.entity.PurchaseOrderLine;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface PurchaseOrderMapper {

    @Mapping(source = "partner.code", target = "partnerCode")
    @Mapping(source = "partner.name", target = "partnerName")
    @Mapping(source = "partner.phone", target = "partnerPhone")
    @Mapping(source = "createdByUser.fullName", target = "createdByName")
    PurchaseOrderResponse toSummaryResponse(PurchaseOrder po);

    @Mapping(source = "variant.product.productName", target = "productName")
    @Mapping(source = "variant.variantName", target = "variantName")
    @Mapping(source = "variant.sku", target = "sku")
    @Mapping(source = "variant.product.productCode", target = "productCode")
    @Mapping(source = "variant.product.unit.name", target = "unitName")
    @Mapping(source = "warehouse.code", target = "warehouseCode")
    @Mapping(source = "warehouse.name", target = "warehouseName")
    PurchaseOrderLineResponse toLineResponse(PurchaseOrderLine line);

    PurchaseOrderLine toLineEntity(PurchaseOrderLineRequest dto);
}
