package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.ProductRequest;
import com.duylongtech.backend.dto.request.ProductVariantRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.ProductResponse;
import com.duylongtech.backend.dto.response.ProductVariantResponse;
import com.duylongtech.backend.service.ProductService;
import com.duylongtech.backend.service.AuditLogService;
import jakarta.validation.Valid;
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
    public ResponseEntity<Page<ProductResponse>> getProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId) {
        return ResponseEntity.ok(productService.getProducts(page, size, search, categoryId));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('product:export')")
    public ResponseEntity<byte[]> exportProducts(
            @RequestParam(required = false) String search,
            org.springframework.security.core.Authentication authentication) {
        String exporterName = authentication != null ? authentication.getName() : "System";
        byte[] excelBytes = productService.exportProductsToExcel(search, exporterName);

        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        String timestamp = java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String filename = "DLC_WMS_Danh_Sach_San_Pham_" + timestamp + ".xlsx";
        headers.add("Content-Disposition", "attachment; filename=\"" + filename + "\"");

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(org.springframework.http.MediaType
                        .parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }

    @GetMapping("/variants")
    @PreAuthorize("hasAuthority('product:view')")
    public ResponseEntity<Page<ProductVariantResponse>> getVariants(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "1000") int size,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(productService.getVariants(page, size, search));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('product:view')")
    public ResponseEntity<ProductResponse> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @GetMapping("/{id}/variants")
    @PreAuthorize("hasAuthority('product:view')")
    public ResponseEntity<java.util.List<ProductVariantResponse>> getProductVariants(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getVariantsByProduct(id));
    }

    @PostMapping("/{id}/variants")
    @PreAuthorize("hasAuthority('product:add')")
    public ResponseEntity<ApiResponse<ProductVariantResponse>> createProductVariant(
            @PathVariable Long id,
            @Valid @RequestBody ProductVariantRequest request) {
        ProductVariantResponse created = productService.createVariant(id, request);
        return ResponseEntity.ok(ApiResponse.<ProductVariantResponse>builder()
                .success(true)
                .userMessage("Tao SKU thanh cong")
                .data(created)
                .build());
    }

    @PutMapping("/{id}/variants/{variantId}")
    @PreAuthorize("hasAuthority('product:edit')")
    public ResponseEntity<ApiResponse<ProductVariantResponse>> updateProductVariant(
            @PathVariable Long id,
            @PathVariable Long variantId,
            @Valid @RequestBody ProductVariantRequest request) {
        ProductVariantResponse updated = productService.updateVariant(id, variantId, request);
        return ResponseEntity.ok(ApiResponse.<ProductVariantResponse>builder()
                .success(true)
                .userMessage("Cap nhat SKU thanh cong")
                .data(updated)
                .build());
    }

    @DeleteMapping("/{id}/variants/{variantId}")
    @PreAuthorize("hasAuthority('product:delete')")
    public ResponseEntity<ApiResponse<Void>> deleteProductVariant(
            @PathVariable Long id,
            @PathVariable Long variantId) {
        productService.deleteVariant(id, variantId);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .userMessage("Xoa SKU thanh cong")
                .build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('product:add')")
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(@Valid @RequestBody ProductRequest dto, jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            ProductResponse created = productService.createProduct(dto);
            String detailJson = auditLogService.buildChangeDetail(null, created, "Tạo mới sản phẩm");
            auditLogService.logEvent(
                actor,
                "CREATE",
                "Product",
                created.getId(),
                "SUCCESS",
                "Thêm mới sản phẩm " + created.getProductCode(),
                ip,
                detailJson
            );
            return ResponseEntity.ok(ApiResponse.<ProductResponse>builder()
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
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(@PathVariable Long id, @Valid @RequestBody ProductRequest dto, jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            ProductResponse before = productService.getProductById(id);
            ProductResponse updated = productService.updateProduct(id, dto);
            String detailJson = auditLogService.buildChangeDetail(before, updated, "Cập nhật sản phẩm");
            auditLogService.logEvent(
                actor,
                "UPDATE",
                "Product",
                id,
                "SUCCESS",
                "Cập nhật sản phẩm " + updated.getProductCode(),
                ip,
                detailJson
            );
            return ResponseEntity.ok(ApiResponse.<ProductResponse>builder()
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
        ProductResponse target = null;
        try {
            target = productService.getProductById(id);
            if (target != null) {
                productCode = target.getProductCode();
            }
        } catch (Exception ignored) {}

        try {
            productService.deleteProduct(id);
            String detailJson = auditLogService.buildChangeDetail(target, null, "Xóa sản phẩm");
            auditLogService.logEvent(
                actor,
                "DELETE",
                "Product",
                id,
                "SUCCESS",
                "Xóa sản phẩm " + productCode,
                ip,
                detailJson
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
