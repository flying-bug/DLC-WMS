package com.duylongtech.backend.service;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.ProductCategoryRequest;
import com.duylongtech.backend.dto.response.ProductCategoryResponse;
import com.duylongtech.backend.entity.ProductCategory;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.ProductCategoryRepository;
import com.duylongtech.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

public interface ProductCategoryService {
    Page<ProductCategoryResponse> getCategories(String search, Pageable pageable);
    ProductCategoryResponse getCategoryById(Long id);
    ProductCategoryResponse createCategory(ProductCategoryRequest dto);
    ProductCategoryResponse updateCategory(Long id, ProductCategoryRequest dto);
    void deleteCategory(Long id);
}
