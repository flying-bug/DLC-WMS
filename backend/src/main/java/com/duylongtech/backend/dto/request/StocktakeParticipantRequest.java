package com.duylongtech.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StocktakeParticipantRequest {
    private String fullName;
    private String title;
    private String represent;
}
