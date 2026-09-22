package com.duylongtech.backend.feature.product;

import com.duylongtech.backend.enums.DocumentStatus;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.feature.product.ProductCategoryRequest;
import com.duylongtech.backend.feature.product.ProductCategoryResponse;
import com.duylongtech.backend.feature.product.ProductCategory;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.product.ProductCategoryMapper;
import com.duylongtech.backend.feature.product.ProductCategoryRepository;
import com.duylongtech.backend.feature.product.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.ProductCategory;
import com.duylongtech.backend.feature.product.ProductCategoryMapper;
import com.duylongtech.backend.feature.product.ProductCategoryRepository;
import com.duylongtech.backend.feature.product.ProductCategoryRequest;
import com.duylongtech.backend.feature.product.ProductCategoryResponse;
import com.duylongtech.backend.feature.product.ProductCategoryService;
import com.duylongtech.backend.feature.product.ProductRepository;
import com.duylongtech.backend.feature.system.CodeGeneratorService;

@Service
@RequiredArgsConstructor
public class ProductCategoryService {

    private final ProductCategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final CodeGeneratorService codeGeneratorService;
    private final ProductCategoryMapper categoryMapper;

    public Page<ProductCategoryResponse> getCategories(String search, String status, Pageable pageable) {
        // Lọc trạng thái ở tầng DB để totalElements khớp với bộ lọc (phân trang phía server).
        String keyword = search != null && !search.isBlank() ? search.trim() : null;
        String statusFilter = status != null && !status.isBlank() ? status.trim() : null;
        return categoryRepository.search(keyword, statusFilter, pageable).map(categoryMapper::toResponse);
    }

    public ProductCategoryResponse getCategoryById(Long id) {
        ProductCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new BusinessException(SystemMessage.CATEGORY_NOT_FOUND));
        return categoryMapper.toResponse(category);
    }

    @Transactional
    public ProductCategoryResponse createCategory(ProductCategoryRequest dto) {
        if (dto.getCode() == null || dto.getCode().isBlank()) {
            String prefix = codeGeneratorService.generatePrefixFromName(dto.getName());
            dto.setCode(codeGeneratorService.generateCode("product_categories", "code", prefix, 3));
        }
        if (categoryRepository.existsByCode(dto.getCode())) {
            throw new BusinessException(SystemMessage.CATEGORY_CODE_EXISTS);
        }

        validateParentExists(dto.getParentId());

        ProductCategory category = new ProductCategory();
        category.initCategory(dto.getName(), dto.getDescription(), null);
        category.setCode(dto.getCode());
        category.setParentId(dto.getParentId());

        ProductCategory saved = categoryRepository.save(category);
        return categoryMapper.toResponse(saved);
    }

    @Transactional
    public ProductCategoryResponse updateCategory(Long id, ProductCategoryRequest dto) {
        ProductCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new BusinessException(SystemMessage.CATEGORY_NOT_FOUND));

        validateParent(id, dto.getParentId());

        category.updateDetails(dto.getName(), dto.getDescription());
        if (dto.getParentId() != null) {
            category.setParentId(dto.getParentId());
        }

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
