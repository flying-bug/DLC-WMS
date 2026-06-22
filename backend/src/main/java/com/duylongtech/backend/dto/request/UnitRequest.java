package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnitRequest {
    @NotBlank(message = "FIELD_REQUIRED")
    private String name;

    private String description;
    private String status;
}
