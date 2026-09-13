package com.duylongtech.backend.feature.system;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatResponse {
    private String answer;
    private String intent;
    private List<AiSourceResponse> sources;
    private List<String> suggestions;
}
