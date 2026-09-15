package com.duylongtech.backend.feature.product;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class QuickFinishedProductRequest {
    @NotBlank(message = "FIELD_REQUIRED")
    private String productName;

    @NotNull(message = "FIELD_REQUIRED")
    private Long categoryId;

    @NotNull(message = "FIELD_REQUIRED")
    private Long unitId;
}
