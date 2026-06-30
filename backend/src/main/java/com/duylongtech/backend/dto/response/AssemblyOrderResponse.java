package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class AssemblyOrderResponse {
    private Long id;
    private String orderCode;
    private String orderType;
    private Long bomId;
    private String bomCode;
    private String bomName;
    private Long targetVariantId;
    private String targetSku;
    private String targetName;
    private Long warehouseId;
    private BigDecimal quantity;
    private String status;
    private LocalDate executionDate;
    private String note;
    private Long createdBy;
    private Long approvedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<AssemblyOrderLineResponse> lines;
}
