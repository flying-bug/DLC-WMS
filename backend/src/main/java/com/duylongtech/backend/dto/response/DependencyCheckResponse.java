package com.duylongtech.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DependencyCheckResponse {
    private boolean canUnpost;
    private String level; // CLEAN, HAS_DEPENDENCIES, LOCKED
    private String message;
    
    @Builder.Default
    private List<String> details = new ArrayList<>();
    
    @Builder.Default
    private List<String> conflictingSerials = new ArrayList<>();
    
    @Builder.Default
    private List<String> conflictingDocuments = new ArrayList<>();
}
