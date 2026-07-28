package com.duylongtech.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StocktakeParticipantResponse {
    private Long id;
    private String fullName;
    private String title;
    private String represent;
}
