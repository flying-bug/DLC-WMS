package com.duylongtech.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StocktakeResponse {
    private Long id;
    private String stocktakeCode;
    private Long warehouseId;
    private String warehouseName;
    private String purpose;
    private LocalDate stocktakeDate;
    private String conclusion;
    private String status;
    private Long referenceImportId;
    private Long referenceExportId;
    private Long createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<StocktakeLineResponse> lines;
    private List<StocktakeParticipantResponse> participants;
}
