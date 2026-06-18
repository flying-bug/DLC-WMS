package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "FIELD_REQUIRED")
    private String username;

    @NotBlank(message = "FIELD_REQUIRED")
    private String password;
}
