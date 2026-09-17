package com.duylongtech.backend.feature.repair;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RepairPaymentRequest {
    private String paymentMethod;
    @NotBlank private String idempotencyKey;
}
