package com.duylongtech.backend.feature.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChangePasswordRequest {
    @NotBlank(message = "FIELD_REQUIRED")
    private String oldPassword;

    @NotBlank(message = "FIELD_REQUIRED")
    private String newPassword;
}
