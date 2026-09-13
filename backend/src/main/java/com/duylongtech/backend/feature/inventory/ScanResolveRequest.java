package com.duylongtech.backend.feature.inventory;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ScanResolveRequest {
    @NotBlank(message = "FIELD_REQUIRED")
    private String code;

    @NotNull(message = "FIELD_REQUIRED")
    private Long warehouseId;

    private Long variantId;
}
