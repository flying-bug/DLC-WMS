package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RepairStatusUpdateRequest {
    @NotBlank(message = "status is required")
    private String status;
}
