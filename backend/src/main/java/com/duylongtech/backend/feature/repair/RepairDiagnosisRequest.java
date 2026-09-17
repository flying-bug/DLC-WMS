package com.duylongtech.backend.feature.repair;

import lombok.Data;

@Data
public class RepairDiagnosisRequest {
    private String diagnosisNote;
    private String solutionDescription;
}
