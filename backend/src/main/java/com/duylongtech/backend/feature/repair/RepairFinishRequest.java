package com.duylongtech.backend.feature.repair;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class RepairFinishRequest {
    @NotBlank(message = "outcome là bắt buộc")
    private String outcome;

    private String qcResult;
    private String qcNote;
    private String qcChecklist;

    @Valid
    private List<RepairRemovalRequest> removals = List.of();
}
