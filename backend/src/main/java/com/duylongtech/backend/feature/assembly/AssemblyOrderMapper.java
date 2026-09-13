package com.duylongtech.backend.feature.assembly;

import com.duylongtech.backend.feature.assembly.AssemblyBomLineResponse;
import com.duylongtech.backend.feature.assembly.AssemblyBomResponse;
import com.duylongtech.backend.feature.assembly.AssemblyOrderLineResponse;
import com.duylongtech.backend.feature.assembly.AssemblyOrderResponse;
import com.duylongtech.backend.feature.assembly.AssemblyBom;
import com.duylongtech.backend.feature.assembly.AssemblyBomLine;
import com.duylongtech.backend.feature.assembly.AssemblyOrder;
import com.duylongtech.backend.feature.assembly.AssemblyOrderLine;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;
import com.duylongtech.backend.feature.product.Product;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface AssemblyOrderMapper {

    @Mapping(target = "productId", source = "product.id")
    @Mapping(target = "productCode", source = "product.productCode")
    @Mapping(target = "productName", source = "product.productName")
    @Mapping(target = "unitName", source = "product.unit.name")
    AssemblyBomResponse toBomResponse(AssemblyBom bom);

    @Mapping(target = "componentVariantId", source = "componentVariant.id")
    AssemblyBomLineResponse toBomLineResponse(AssemblyBomLine line);

    @Mapping(target = "bomId", source = "bom.id")
    @Mapping(target = "bomCode", source = "bom.bomCode")
    @Mapping(target = "bomName", source = "bom.bomName")
    @Mapping(target = "targetVariantId", source = "targetVariant.id")
    @Mapping(target = "targetSku", source = "targetVariant.sku")
    @Mapping(target = "targetSalePrice", source = "targetVariant.salePrice")
    AssemblyOrderResponse toOrderResponse(AssemblyOrder order);

    @Mapping(target = "componentVariantId", source = "componentVariant.id")
    @Mapping(target = "componentSku", source = "componentVariant.sku")
    @Mapping(target = "salePrice", source = "componentVariant.salePrice")
    @Mapping(target = "unitName", source = "componentVariant.product.unit.name")
    @Mapping(target = "trackSerial", source = "componentVariant.product.trackSerial")
    AssemblyOrderLineResponse toOrderLineResponse(AssemblyOrderLine line);
}
