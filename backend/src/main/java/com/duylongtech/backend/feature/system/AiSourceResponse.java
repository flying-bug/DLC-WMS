package com.duylongtech.backend.feature.system;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiSourceResponse {
    private String type;
    private String name;
    private String description;
}
