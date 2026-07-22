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
public class ProductVariantRequest {
    @NotBlank(message = "FIELD_REQUIRED")
    private String sku;

    private String barcode;

    @NotBlank(message = "FIELD_REQUIRED")
    private String variantName;

    private BigDecimal costPrice;

    @NotNull(message = "FIELD_REQUIRED")
    private BigDecimal salePrice;

    private String manufacturerPartNumber;
    private String specsJson;
    private Boolean active;
    private Integer warrantyMonths;
}
