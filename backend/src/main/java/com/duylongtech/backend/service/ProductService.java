package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.ProductRequest;
import com.duylongtech.backend.dto.request.ProductUnitConversionRequest;
import com.duylongtech.backend.dto.request.ProductVariantRequest;
import com.duylongtech.backend.dto.response.ProductResponse;
import com.duylongtech.backend.dto.response.ProductUnitConversionResponse;
import com.duylongtech.backend.dto.response.ProductVariantResponse;
import com.duylongtech.backend.dto.response.StockAlertSummaryResponse;
import org.springframework.data.domain.Page;

import java.util.List;

public interface ProductService {
    Page<ProductResponse> getProducts(int page, int size, String search, Long categoryId, String productType, Long brandId, Long unitId);
    StockAlertSummaryResponse getStockAlertSummary();
    ProductResponse getProductById(Long id);
    ProductResponse createProduct(ProductRequest dto);
    ProductResponse updateProduct(Long id, ProductRequest dto);
    void deleteProduct(Long id);
    byte[] exportProductsToExcel(String search, Long categoryId, String productType, Long brandId, Long unitId, String exporterName);
    Page<ProductVariantResponse> getVariants(int page, int size, String search);
    List<ProductVariantResponse> getVariantsByProduct(Long productId);
    List<String> generateSerialCodes(Long productId, Long variantId, int quantity);
    ProductVariantResponse createVariant(Long productId, ProductVariantRequest request);
    ProductVariantResponse updateVariant(Long productId, Long variantId, ProductVariantRequest request);
    void deleteVariant(Long productId, Long variantId);

}
