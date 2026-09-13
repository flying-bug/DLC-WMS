package com.duylongtech.backend.feature.product;

import com.duylongtech.backend.feature.product.ProductRequest;
import com.duylongtech.backend.feature.product.ProductUnitConversionRequest;
import com.duylongtech.backend.feature.product.ProductVariantRequest;
import com.duylongtech.backend.feature.product.ProductResponse;
import com.duylongtech.backend.feature.product.ProductUnitConversionResponse;
import com.duylongtech.backend.feature.product.ProductVariantResponse;
import com.duylongtech.backend.feature.product.StockAlertSummaryResponse;
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
