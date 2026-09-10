package com.duylongtech.backend.mapper;

import com.duylongtech.backend.dto.request.ProductCategoryRequest;
import com.duylongtech.backend.dto.response.ProductCategoryResponse;
import com.duylongtech.backend.entity.ProductCategory;
import com.duylongtech.backend.repository.ProductCategoryRepository;
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
