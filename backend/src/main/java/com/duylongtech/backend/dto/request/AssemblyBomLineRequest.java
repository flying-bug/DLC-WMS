package com.duylongtech.backend.dto.request;

import lombok.Data;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

@Data
public class AssemblyBomLineRequest {
    @NotNull(message = "MSG02")
    private Long componentVariantId;

    @NotNull(message = "MSG02")
    @DecimalMin(value = "0.0001", message = "Số lượng phải lớn hơn 0")
    private BigDecimal quantity;

    @NotNull(message = "MSG02")
    @DecimalMin(value = "0.0", message = "Tỷ lệ phân bổ không được âm")
    private BigDecimal costAllocationPct;

    private String note;
}
