package com.duylongtech.backend.dto.request;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class AssemblyBomRequest {
    private Long productId;
    private String bomCode;
    private String bomName;
    private BigDecimal versionNo;
    private String status;
    private List<AssemblyBomLineRequest> lines;
}
