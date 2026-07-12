package com.duylongtech.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class GenerateInventoryDocumentRequest {

    @NotNull(message = "MSG02")
    private String documentType;

    @NotEmpty(message = "MSG02")
    @Valid
    private List<GenerateInventoryDocumentLineRequest> lines;
}
