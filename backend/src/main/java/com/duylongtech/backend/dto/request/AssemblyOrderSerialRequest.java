package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssemblyOrderSerialRequest {
    @NotNull(message = "Target variant ID cannot be null")
    private Long targetVariantId;

    @NotBlank(message = "Target serial cannot be blank")
    private String targetSerial;

    @NotNull(message = "Component variant ID cannot be null")
    private Long componentVariantId;

    @NotBlank(message = "Component serial cannot be blank")
    private String componentSerial;
}
