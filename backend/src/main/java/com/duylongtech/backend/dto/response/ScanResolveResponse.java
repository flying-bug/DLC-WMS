package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class ScanResolveResponse {
    private String type;
    private String code;
    private Long productId;
    private Long variantId;
    private Long serialNumberId;
    private String productCode;
    private String productName;
    private String sku;
    private String barcode;
    private String serialNumber;
    private String unitName;
    private Boolean trackSerial;
    private BigDecimal salePrice;
    private BigDecimal costPrice;
}
