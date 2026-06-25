package com.duylongtech.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductVariantResponse {
    private Long id;
    private Long productId;
    private String productCode;
    private String productName;
    private Long brandId;
    private String brandName;
    private Long categoryId;
    private String categoryName;
    private Long unitId;
    private String unitName;
    private String sku;
    private String variantName;
    private BigDecimal costPrice;
    private BigDecimal salePrice;
    private String manufacturerPartNumber;
    private String specsJson;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
