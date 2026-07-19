package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RepairRequest {
    @NotNull(message = "partnerId is required")
    private Long partnerId;

    @NotNull(message = "productId is required")
    private Long productId;

    private Long serialNumberId;

    @NotBlank(message = "issueDescription is required")
    private String issueDescription;

    @NotNull(message = "underWarranty is required")
    private Boolean underWarranty;

    @NotBlank(message = "invoiceMethod is required")
    private String invoiceMethod;
}
