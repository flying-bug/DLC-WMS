package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequest {
    @NotNull(message = "FIELD_REQUIRED")
    private Long brandId;

    @NotNull(message = "FIELD_REQUIRED")
    private Long categoryId;

    @NotNull(message = "FIELD_REQUIRED")
    private Long unitId;

    @NotBlank(message = "FIELD_REQUIRED")
    private String productCode;

    @NotBlank(message = "FIELD_REQUIRED")
    private String productName;

    private String productType;
    @NotNull(message = "FIELD_REQUIRED")
    private BigDecimal salePrice;
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
}
