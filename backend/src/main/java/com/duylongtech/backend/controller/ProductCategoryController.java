package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.ProductCategoryRequest;
import com.duylongtech.backend.dto.response.ProductCategoryResponse;
import com.duylongtech.backend.service.AuditLogService;
import com.duylongtech.backend.service.ProductCategoryService;
import jakarta.servlet.http.HttpServletRequest;
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
    private final AuditLogService auditLogService;

    private String getClientIp(HttpServletRequest request) {
        String ipAddress = request.getHeader("X-Forwarded-For");
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getRemoteAddr();
        }
        if (ipAddress != null && ipAddress.contains(",")) {
            ipAddress = ipAddress.split(",")[0].trim();
        }
        return ipAddress;
    }

    private String getCurrentUser() {
        return org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
    }

    @GetMapping
    @PreAuthorize("hasAuthority('product:view')")
    public ResponseEntity<Page<ProductCategoryResponse>> getCategories(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(categoryService.getCategories(search, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('product:view')")
    public ResponseEntity<ProductCategoryResponse> getCategoryById(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.getCategoryById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('product:add')")
    public ResponseEntity<ProductCategoryResponse> createCategory(
            @Valid @RequestBody ProductCategoryRequest dto,
            HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            ProductCategoryResponse created = categoryService.createCategory(dto);
            String detailJson = auditLogService.buildChangeDetail(null, created, "Tao moi danh muc san pham");
            auditLogService.logEvent(
                    actor,
                    "CREATE",
                    "ProductCategory",
                    created.getId(),
                    "SUCCESS",
                    "Them moi danh muc san pham: " + created.getName(),
                    ip,
                    detailJson
            );
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            auditLogService.logEvent(
                    actor,
                    "CREATE",
                    "ProductCategory",
                    null,
                    "FAILED",
                    "Them moi danh muc san pham " + dto.getName() + " that bai: " + e.getMessage(),
                    ip,
                    null
            );
            throw e;
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('product:edit')")
    public ResponseEntity<ProductCategoryResponse> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody ProductCategoryRequest dto,
            HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            ProductCategoryResponse before = categoryService.getCategoryById(id);
            ProductCategoryResponse updated = categoryService.updateCategory(id, dto);
            String detailJson = auditLogService.buildChangeDetail(before, updated, "Cap nhat danh muc san pham");
            auditLogService.logEvent(
                    actor,
                    "UPDATE",
                    "ProductCategory",
                    id,
                    "SUCCESS",
                    "Cap nhat danh muc san pham: " + updated.getName(),
                    ip,
                    detailJson
            );
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            auditLogService.logEvent(
                    actor,
                    "UPDATE",
                    "ProductCategory",
                    id,
                    "FAILED",
                    "Cap nhat danh muc san pham ID " + id + " that bai: " + e.getMessage(),
                    ip,
                    null
            );
            throw e;
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('product:delete')")
    public ResponseEntity<Void> deleteCategory(
            @PathVariable Long id,
            HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        String categoryName = "ID " + id;
        ProductCategoryResponse target = null;
        try {
            target = categoryService.getCategoryById(id);
            categoryName = target.getName();
        } catch (Exception ignored) {
        }

        try {
            categoryService.deleteCategory(id);
            String detailJson = auditLogService.buildChangeDetail(target, null, "Xoa danh muc san pham");
            auditLogService.logEvent(
                    actor,
                    "DELETE",
                    "ProductCategory",
                    id,
                    "SUCCESS",
                    "Xoa danh muc san pham: " + categoryName,
                    ip,
                    detailJson
            );
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            auditLogService.logEvent(
                    actor,
                    "DELETE",
                    "ProductCategory",
                    id,
                    "FAILED",
                    "Xoa danh muc san pham " + categoryName + " that bai: " + e.getMessage(),
                    ip,
                    null
            );
            throw e;
        }
    }
}
