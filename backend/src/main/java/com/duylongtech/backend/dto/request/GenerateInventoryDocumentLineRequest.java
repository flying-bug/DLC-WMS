package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class GenerateInventoryDocumentLineRequest {
    @NotNull(message = "MSG02")
    private Long variantId;

    @NotNull(message = "MSG02")
    @DecimalMin(value = "0.0001", message = "Số lượng phải lớn hơn 0")
    private BigDecimal quantity;

    private List<String> serialNumbers;
}
