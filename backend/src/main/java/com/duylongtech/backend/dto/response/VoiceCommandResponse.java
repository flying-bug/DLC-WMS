package com.duylongtech.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoiceCommandResponse {
    /** The recognized intent, e.g. CREATE_IMPORT, VIEW_PRODUCTS */
    private String intent;

    /** The frontend route to navigate to */
    private String route;

    /** Extracted structured data from the voice command */
    private Map<String, Object> data;

    /** Human-readable confirmation message in Vietnamese */
    private String confirmMessage;

    /** Original transcript that was parsed */
    private String transcript;
}
