package com.duylongtech.backend.feature.sales_order;

import com.duylongtech.backend.feature.sales_order.SalesOrderResponse;
import com.duylongtech.backend.feature.sales_order.SalesOrder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.NullValuePropertyMappingStrategy;

import com.duylongtech.backend.feature.sales_order.SalesOrderRequest.SalesOrderLineRequest;
import com.duylongtech.backend.feature.sales_order.SalesOrderResponse.SalesOrderLineResponse;
import com.duylongtech.backend.feature.sales_order.SalesOrderResponse.StockReservationResponse;
import com.duylongtech.backend.feature.sales_order.SalesOrderLine;
import com.duylongtech.backend.feature.inventory.StockReservation;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.warehouse.Warehouse;

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
}
