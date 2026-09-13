package com.duylongtech.backend.feature.product;

import com.duylongtech.backend.feature.product.ProductCategoryRequest;
import com.duylongtech.backend.feature.product.ProductCategoryResponse;
import com.duylongtech.backend.feature.product.ProductCategory;
import com.duylongtech.backend.feature.product.ProductCategoryRepository;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.springframework.beans.factory.annotation.Autowired;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public abstract class ProductCategoryMapper {

    @Autowired
    protected ProductCategoryRepository categoryRepository;

    public abstract ProductCategoryResponse toResponse(ProductCategory category);

    @AfterMapping
    protected void mapParentName(ProductCategory category, @MappingTarget ProductCategoryResponse.ProductCategoryResponseBuilder responseBuilder) {
        if (category.getParentId() != null) {
            categoryRepository.findById(category.getParentId())
                    .ifPresent(parent -> responseBuilder.parentName(parent.getName()));
        }
    }

    public abstract ProductCategory toEntity(ProductCategoryRequest request);

    public abstract void updateEntity(@MappingTarget ProductCategory category, ProductCategoryRequest request);
}
