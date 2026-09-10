package com.duylongtech.backend.service.impl;

import com.duylongtech.backend.service.*;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.ProductCategoryRequest;
import com.duylongtech.backend.dto.response.ProductCategoryResponse;
import com.duylongtech.backend.entity.ProductCategory;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.mapper.ProductCategoryMapper;
import com.duylongtech.backend.repository.ProductCategoryRepository;
import com.duylongtech.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProductCategoryServiceImpl  implements ProductCategoryService {

    private final ProductCategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final CodeGeneratorService codeGeneratorService;
    private final ProductCategoryMapper categoryMapper;

    public Page<ProductCategoryResponse> getCategories(String search, Pageable pageable) {
        Page<ProductCategory> categories;
        if (search != null && !search.trim().isEmpty()) {
            String keyword = search.trim();
            categories = categoryRepository.findByNameContainingIgnoreCaseOrCodeContainingIgnoreCase(
                    keyword,
                    keyword,
                    pageable
            );
        } else {
            categories = categoryRepository.findAll(pageable);
        }
        return categories.map(categoryMapper::toResponse);
    }

    public ProductCategoryResponse getCategoryById(Long id) {
        ProductCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new BusinessException(SystemMessage.CATEGORY_NOT_FOUND));
        return categoryMapper.toResponse(category);
    }

    @Transactional
    public ProductCategoryResponse createCategory(ProductCategoryRequest dto) {
        if (dto.getCode() == null || dto.getCode().isBlank()) {
            dto.setCode(codeGeneratorService.generateCode("product_categories", "code", "DM", 3));
        }
        if (categoryRepository.existsByCode(dto.getCode())) {
            throw new BusinessException(SystemMessage.CATEGORY_CODE_EXISTS);
        }

        validateParentExists(dto.getParentId());

        ProductCategory category = categoryMapper.toEntity(dto);
        if (category.getStatus() == null) {
            category.setStatus("APPROVED");
        }

        ProductCategory saved = categoryRepository.save(category);
        return categoryMapper.toResponse(saved);
    }

    @Transactional
    public ProductCategoryResponse updateCategory(Long id, ProductCategoryRequest dto) {
        ProductCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new BusinessException(SystemMessage.CATEGORY_NOT_FOUND));

        validateParent(id, dto.getParentId());

        categoryMapper.updateEntity(category, dto);

        ProductCategory updated = categoryRepository.save(category);
        return categoryMapper.toResponse(updated);
    }

    @Transactional
    public void deleteCategory(Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new BusinessException(SystemMessage.CATEGORY_NOT_FOUND);
        }
        if (productRepository.existsByCategoryId(id)) {
            throw new BusinessException(SystemMessage.CATEGORY_HAS_PRODUCTS);
        }
        categoryRepository.deleteById(id);
    }

    private void validateParentExists(Long parentId) {
        if (parentId != null && !categoryRepository.existsById(parentId)) {
            throw new BusinessException(SystemMessage.CATEGORY_PARENT_NOT_FOUND);
        }
    }

    private void validateParent(Long categoryId, Long parentId) {
        if (parentId == null) {
            return;
        }
        if (parentId.equals(categoryId)) {
            throw new BusinessException(SystemMessage.CATEGORY_INVALID_PARENT);
        }

        ProductCategory parent = categoryRepository.findById(parentId)
                .orElseThrow(() -> new BusinessException(SystemMessage.CATEGORY_PARENT_NOT_FOUND));
        while (parent.getParentId() != null) {
            if (parent.getParentId().equals(categoryId)) {
                throw new BusinessException(SystemMessage.CATEGORY_INVALID_PARENT);
            }
            parent = categoryRepository.findById(parent.getParentId())
                    .orElseThrow(() -> new BusinessException(SystemMessage.CATEGORY_PARENT_NOT_FOUND));
        }
    }


}
