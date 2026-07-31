package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class WarrantyLineResponse {
    private Long id;
    private Long serialNumberId;
    private String serialNumber;
    private Long productVariantId;
    private String variantName;
    private String sku;
    private BigDecimal quantity;
    private LocalDate startDate;
    private LocalDate endDate;
    private String warrantyStatus;
}
