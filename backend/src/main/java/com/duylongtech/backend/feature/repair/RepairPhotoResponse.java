package com.duylongtech.backend.feature.repair;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class RepairPhotoResponse {
    private Long id;
    private Long repairId;
    /** INTAKE | DIAGNOSIS | COMPLETION */
    private String phase;
    private String category;
    private String secureUrl;
    private String publicId;
    private String caption;
    private Boolean locked;
    private Long uploadedBy;
    private String uploadedByName;
    private LocalDateTime createdAt;
    private LocalDateTime watermarkedAt;
}
