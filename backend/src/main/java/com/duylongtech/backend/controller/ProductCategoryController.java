package com.duylongtech.backend.controller;

import com.duylongtech.backend.annotation.Auditable;
import com.duylongtech.backend.enums.AuditAction;
import com.duylongtech.backend.dto.request.ProductCategoryRequest;
import com.duylongtech.backend.dto.response.ProductCategoryResponse;
import com.duylongtech.backend.service.ProductCategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/product-categories")
@RequiredArgsConstructor
public class ProductCategoryController {

    private final ProductCategoryService categoryService;

    @GetMapping
    @PreAuthorize("hasAuthority('product_category:view')")
    public ResponseEntity<Page<ProductCategoryResponse>> getCategories(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(categoryService.getCategories(search, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('product_category:view')")
    public ResponseEntity<ProductCategoryResponse> getCategoryById(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.getCategoryById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('product_category:add')")
    @Auditable(action = AuditAction.CREATE, entityName = "ProductCategory", actionDescription = "Thêm mới danh mục sản phẩm")
    public ResponseEntity<ProductCategoryResponse> createCategory(
            @Valid @RequestBody ProductCategoryRequest dto) {
        return ResponseEntity.ok(categoryService.createCategory(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('product_category:edit')")
    @Auditable(action = AuditAction.UPDATE, entityName = "ProductCategory", actionDescription = "Cập nhật danh mục sản phẩm")
    public ResponseEntity<ProductCategoryResponse> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody ProductCategoryRequest dto) {
        return ResponseEntity.ok(categoryService.updateCategory(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('product_category:delete')")
    @Auditable(action = AuditAction.DELETE, entityName = "ProductCategory", actionDescription = "Xóa danh mục sản phẩm")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }
}
