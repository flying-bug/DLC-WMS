package com.duylongtech.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BrandResponse {
    private Long id;
    private String code;
    private String name;
    private String status;
    private String description;
    private String hotline;
    private String contactEmail;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
