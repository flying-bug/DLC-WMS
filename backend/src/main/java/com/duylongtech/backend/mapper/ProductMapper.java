package com.duylongtech.backend.mapper;

import com.duylongtech.backend.dto.request.ProductRequest;
import com.duylongtech.backend.dto.response.ProductResponse;
import com.duylongtech.backend.entity.Product;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.NullValuePropertyMappingStrategy;

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

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "brand", ignore = true) // Handled in Service
    @Mapping(target = "category", ignore = true) // Handled in Service
    @Mapping(target = "unit", ignore = true) // Handled in Service
    Product toEntity(ProductRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "brand", ignore = true) // Handled in Service
    @Mapping(target = "category", ignore = true) // Handled in Service
    @Mapping(target = "unit", ignore = true) // Handled in Service
    void updateEntity(@MappingTarget Product entity, ProductRequest request);
}
