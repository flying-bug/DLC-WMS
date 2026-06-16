package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChangePasswordRequest {
    @NotBlank(message = "FIELD_REQUIRED")
    private String oldPassword;

    @NotBlank(message = "FIELD_REQUIRED")
    private String newPassword;
}
