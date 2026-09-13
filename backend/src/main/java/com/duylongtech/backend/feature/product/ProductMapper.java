package com.duylongtech.backend.feature.product;

import com.duylongtech.backend.feature.product.ProductRequest;
import com.duylongtech.backend.feature.product.ProductResponse;
import com.duylongtech.backend.feature.product.Product;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.NullValuePropertyMappingStrategy;
import com.duylongtech.backend.feature.brand.Brand;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE,
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface ProductMapper {

    @Mapping(source = "brand.id", target = "brandId")
    @Mapping(source = "brand.name", target = "brandName")
    @Mapping(source = "category.id", target = "categoryId")
    @Mapping(source = "category.name", target = "categoryName")
    @Mapping(source = "unit.id", target = "unitId")
    @Mapping(source = "unit.name", target = "unitName")
    @Mapping(target = "unitConversions", ignore = true) // Handled in Service
    @Mapping(target = "stockQty", ignore = true) // Handled in Service
    ProductResponse toResponse(Product product);

}
