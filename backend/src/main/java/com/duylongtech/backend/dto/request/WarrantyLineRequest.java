package com.duylongtech.backend.dto.request;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class WarrantyLineRequest {
    private Long serialNumberId;
    private Long productVariantId;
    private BigDecimal quantity;
    private LocalDate startDate;
    private LocalDate endDate;
    private String warrantyStatus;
}
