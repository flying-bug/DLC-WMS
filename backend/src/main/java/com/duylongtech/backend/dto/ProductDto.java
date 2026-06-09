package com.duylongtech.backend.dto;

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
public class ProductDto {
    private Long id;
    private Long brandId;
    private String brandName;
    
    private Long categoryId;
    private String categoryName;
    
    private Long unitId;
    private String unitName;
    
    private String productCode;
    private String productName;
    private String productType; // GOODS, SERVICE, FINISHED_PRODUCT
    private Boolean trackSerial;
    private Boolean trackLot;
    private Boolean isAssembly;
    private String description;
    private Boolean active;
    
    private String taxReductionStatus; // Chưa xác định, Giảm, Không giảm
    private BigDecimal stockQty;
    private BigDecimal stockValue;
    private String imageUrl;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
