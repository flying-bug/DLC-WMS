package com.duylongtech.backend.controller;

import com.duylongtech.backend.annotation.Auditable;
import com.duylongtech.backend.enums.AuditAction;
import com.duylongtech.backend.dto.request.ProductRequest;
import com.duylongtech.backend.dto.request.ProductVariantRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.ProductResponse;
import com.duylongtech.backend.dto.response.ProductVariantResponse;
import com.duylongtech.backend.dto.response.StockAlertSummaryResponse;
import com.duylongtech.backend.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
@Slf4j
public class ProductController {
    private final ProductService productService;

    @GetMapping
    @PreAuthorize("hasAuthority('product:view')")
    public ResponseEntity<Page<ProductResponse>> getProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String productType,
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) Long unitId) {
        return ResponseEntity.ok(productService.getProducts(page, size, search, categoryId, productType, brandId, unitId));
    }

    @GetMapping("/stock-alert-summary")
    @PreAuthorize("hasAuthority('product:view')")
    public ResponseEntity<StockAlertSummaryResponse> getStockAlertSummary() {
        return ResponseEntity.ok(productService.getStockAlertSummary());
    }

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('product:export')")
    public ResponseEntity<byte[]> exportProducts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String productType,
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) Long unitId,
            org.springframework.security.core.Authentication authentication) {
        String exporterName = authentication != null ? authentication.getName() : "System";
        byte[] excelBytes = productService.exportProductsToExcel(search, categoryId, productType, brandId, unitId, exporterName);

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

    @PostMapping("/{id}/variants/{variantId}/serial-codes")
    @PreAuthorize("hasAuthority('product:view')")
    @Auditable(action = AuditAction.UPDATE, entityName = "ProductVariant", actionDescription = "Tạo mã serial cho phiên bản sản phẩm")
    public ResponseEntity<ApiResponse<java.util.List<String>>> generateSerialCodes(
            @PathVariable Long id,
            @PathVariable Long variantId,
            @RequestParam int quantity) {
        return ResponseEntity.ok(ApiResponse.success(productService.generateSerialCodes(id, variantId, quantity)));
    }

    @PostMapping("/{id}/variants")
    @PreAuthorize("hasAuthority('product:add')")
    @Auditable(action = AuditAction.CREATE, entityName = "ProductVariant", actionDescription = "Tạo mới phiên bản sản phẩm (SKU)")
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
    @Auditable(action = AuditAction.UPDATE, entityName = "ProductVariant", actionDescription = "Cập nhật phiên bản sản phẩm (SKU)")
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
    @Auditable(action = AuditAction.DELETE, entityName = "ProductVariant", actionDescription = "Xóa phiên bản sản phẩm (SKU)")
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
            try {
                String detailJson = auditLogService.buildChangeDetail(null, created, "Tao moi san pham");
                int variantCount = created.getVariants() != null ? created.getVariants().size() : 0;
                auditLogService.logEvent(
                    actor,
                    "CREATE",
                    "Product",
                    created.getId(),
                    "SUCCESS",
                    "Them moi san pham " + created.getProductCode() + " voi " + variantCount + " SKU",
                    ip,
                    detailJson
                );
            } catch (Exception auditException) {
                log.warn("Audit create product failed for product {}", created.getId(), auditException);
            }
            return ResponseEntity.ok(ApiResponse.<ProductResponse>builder()
                    .success(true)
                    .userMessage("Tạo hàng hóa/dịch vụ thành công")
                    .data(created)
                    .build());
        } catch (Exception e) {
            try {
                auditLogService.logEvent(
                    actor,
                    "CREATE",
                    "Product",
                    null,
                    "FAILED",
                    "Them moi san pham " + dto.getProductCode() + " that bai: " + e.getMessage(),
                    ip,
                    null
                );
            } catch (Exception auditException) {
                log.warn("Audit failed create product failed", auditException);
            }
            throw e;
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('product:edit')")
    @Auditable(action = AuditAction.UPDATE, entityName = "Product", actionDescription = "Cập nhật sản phẩm")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(@PathVariable Long id, @Valid @RequestBody ProductRequest dto) {
        ProductResponse updated = productService.updateProduct(id, dto);
        return ResponseEntity.ok(ApiResponse.<ProductResponse>builder()
                .success(true)
                .userMessage("Cập nhật hàng hóa/dịch vụ thành công")
                .data(updated)
                .build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('product:delete')")
    @Auditable(action = AuditAction.DELETE, entityName = "Product", actionDescription = "Xóa sản phẩm")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .userMessage("Xóa hàng hóa/dịch vụ thành công")
                .build());
    }
}
