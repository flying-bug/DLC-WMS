package com.duylongtech.backend.feature.warranty;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import com.duylongtech.backend.feature.product.SerialNumber;

@Data
@Builder
public class WarrantyLineResponse {
    private Long id;
    private Long serialNumberId;
    private String serialNumber;
    private Long productVariantId;
    private String variantName;
    private String sku;
    private Long productId;
    private String productName;
    private BigDecimal quantity;
    private LocalDate startDate;
    private LocalDate endDate;
    private String warrantyStatus;
}
