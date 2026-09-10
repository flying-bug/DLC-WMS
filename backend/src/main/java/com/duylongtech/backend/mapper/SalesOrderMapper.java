package com.duylongtech.backend.mapper;

import com.duylongtech.backend.dto.response.SalesOrderResponse;
import com.duylongtech.backend.entity.SalesOrder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.NullValuePropertyMappingStrategy;

import com.duylongtech.backend.dto.request.SalesOrderRequest.SalesOrderLineRequest;
import com.duylongtech.backend.dto.response.SalesOrderResponse.SalesOrderLineResponse;
import com.duylongtech.backend.dto.response.SalesOrderResponse.StockReservationResponse;
import com.duylongtech.backend.entity.SalesOrderLine;
import com.duylongtech.backend.entity.StockReservation;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface SalesOrderMapper {

    @Mapping(source = "partner.code", target = "partnerCode")
    @Mapping(source = "partner.name", target = "partnerName")
    @Mapping(source = "partner.phone", target = "partnerPhone")
    @Mapping(source = "partner.email", target = "partnerEmail")
    @Mapping(source = "partner.taxCode", target = "partnerTaxCode")
    @Mapping(source = "partner.address", target = "partnerAddress")
    @Mapping(source = "warehouse.code", target = "warehouseCode")
    @Mapping(source = "warehouse.name", target = "warehouseName")
    @Mapping(source = "createdByUser.fullName", target = "createdByName")
    SalesOrderResponse toSummaryResponse(SalesOrder so);

    @Mapping(source = "variant.variantName", target = "variantName")
    @Mapping(source = "variant.sku", target = "sku")
    @Mapping(source = "warehouse.name", target = "warehouseName")
    StockReservationResponse toReservationResponse(StockReservation reservation);
    
    @Mapping(source = "variant.variantName", target = "variantName")
    @Mapping(source = "variant.sku", target = "sku")
    @Mapping(source = "variant.product.productCode", target = "productCode")
    @Mapping(source = "variant.product.unit.name", target = "unitName")
    @Mapping(source = "warehouse.code", target = "warehouseCode")
    @Mapping(source = "warehouse.name", target = "warehouseName")
    SalesOrderLineResponse toLineResponse(SalesOrderLine line);
    
    SalesOrderLine toLineEntity(SalesOrderLineRequest dto);
}
