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
public class ProductResponse {
    private Long id;
    private Long brandId;
    private String brandName;
    private Long categoryId;
    private String categoryName;
    private Long unitId;
    private String unitName;
    private String productCode;
    private String productName;
    private String productType;
    private BigDecimal salePrice;
    private BigDecimal vatRate;
    private Boolean trackSerial;
    private Boolean trackLot;
    private Boolean isAssembly;
    private String description;
    private Boolean active;
    private String taxReductionStatus;
    private BigDecimal stockQty;
    private BigDecimal minStockQty;
    private BigDecimal stockValue;
    private String imageUrl;
    private String bomTemplate;
    private String warrantyPeriod;
    private Integer warrantyPeriodMonths;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
