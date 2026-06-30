package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class AssemblyBomResponse {
    private Long id;
    private String bomCode;
    private String bomName;
    private BigDecimal versionNo;
    private String status;
    private Long productId;
    private String productCode;
    private String productName;
    private String unitName;
    private List<AssemblyBomLineResponse> lines;
}
