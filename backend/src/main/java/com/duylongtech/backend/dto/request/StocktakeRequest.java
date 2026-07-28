package com.duylongtech.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StocktakeRequest {
    private String stocktakeCode;
    private Long warehouseId;
    private String purpose;
    private LocalDate stocktakeDate;
    private String conclusion;
    private String status;
    private Long createdBy;
    private List<StocktakeLineRequest> lines;
    private List<StocktakeParticipantRequest> participants;
}
