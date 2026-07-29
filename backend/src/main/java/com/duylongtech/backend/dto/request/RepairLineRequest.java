package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
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
public class RepairLineRequest {
    private Long id;

    @NotNull(message = "componentVariantId là bắt buộc")
    private Long componentVariantId;

    @NotNull(message = "actionType là bắt buộc")
    private String actionType; // "ADD" or "REMOVE"

    private Long serialNumberId;

    @NotNull(message = "quantity là bắt buộc")
    @DecimalMin(value = "0.0001", message = "quantity phải lớn hơn 0")
    private BigDecimal quantity;

    @DecimalMin(value = "0", message = "unitPrice không được âm")
    private BigDecimal unitPrice;

    private Boolean isWarrantyCovered;
    private Boolean isFreeWarranty;

    private BigDecimal doneQuantity;
    private Boolean isUsed;

    private java.time.LocalDate dateScheduled;
    private java.time.LocalDate deadline;

    private String note;
}
