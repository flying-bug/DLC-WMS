package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.ProductDto;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.service.ProductService;
import com.duylongtech.backend.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {
    private final ProductService productService;
    private final AuditLogService auditLogService;

    private String getClientIp(jakarta.servlet.http.HttpServletRequest request) {
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
    public ResponseEntity<Page<ProductDto>> getProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(productService.getProducts(page, size, search));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('product:view')")
    public ResponseEntity<ProductDto> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('product:add')")
    public ResponseEntity<ApiResponse<ProductDto>> createProduct(@RequestBody ProductDto dto, jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            ProductDto created = productService.createProduct(dto);
            auditLogService.logEvent(
                actor,
                "CREATE",
                "Product",
                created.getId(),
                "SUCCESS",
                "Thêm mới sản phẩm " + created.getProductCode(),
                ip,
                null
            );
            return ResponseEntity.ok(ApiResponse.<ProductDto>builder()
                    .success(true)
                    .userMessage("Tạo hàng hóa/dịch vụ thành công")
                    .data(created)
                    .build());
        } catch (Exception e) {
            auditLogService.logEvent(
                actor,
                "CREATE",
                "Product",
                null,
                "FAILED",
                "Thêm mới sản phẩm " + dto.getProductCode() + " thất bại: " + e.getMessage(),
                ip,
                null
            );
            throw e;
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('product:edit')")
    public ResponseEntity<ApiResponse<ProductDto>> updateProduct(@PathVariable Long id, @RequestBody ProductDto dto, jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            ProductDto updated = productService.updateProduct(id, dto);
            auditLogService.logEvent(
                actor,
                "UPDATE",
                "Product",
                id,
                "SUCCESS",
                "Cập nhật sản phẩm " + updated.getProductCode(),
                ip,
                null
            );
            return ResponseEntity.ok(ApiResponse.<ProductDto>builder()
                    .success(true)
                    .userMessage("Cập nhật hàng hóa/dịch vụ thành công")
                    .data(updated)
                    .build());
        } catch (Exception e) {
            auditLogService.logEvent(
                actor,
                "UPDATE",
                "Product",
                id,
                "FAILED",
                "Cập nhật sản phẩm ID " + id + " thất bại: " + e.getMessage(),
                ip,
                null
            );
            throw e;
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('product:delete')")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Long id, jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        String productCode = "ID " + id;
        try {
            ProductDto target = productService.getProductById(id);
            if (target != null) {
                productCode = target.getProductCode();
            }
        } catch (Exception ignored) {}

        try {
            productService.deleteProduct(id);
            auditLogService.logEvent(
                actor,
                "DELETE",
                "Product",
                id,
                "SUCCESS",
                "Xóa sản phẩm " + productCode,
                ip,
                null
            );
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .success(true)
                    .userMessage("Xóa hàng hóa/dịch vụ thành công")
                    .build());
        } catch (Exception e) {
            auditLogService.logEvent(
                actor,
                "DELETE",
                "Product",
                id,
                "FAILED",
                "Xóa sản phẩm " + productCode + " thất bại: " + e.getMessage(),
                ip,
                null
            );
            throw e;
        }
    }
}
