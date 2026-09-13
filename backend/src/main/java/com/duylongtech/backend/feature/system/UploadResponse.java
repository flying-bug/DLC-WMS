package com.duylongtech.backend.feature.system;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadResponse {
    private String url;
    private String secureUrl;
    private String publicId;
    private String originalFilename;
}
