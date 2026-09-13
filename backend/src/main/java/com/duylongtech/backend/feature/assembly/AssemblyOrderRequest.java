package com.duylongtech.backend.feature.assembly;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class AssemblyOrderRequest {
    private String orderCode;
    private Long bomId;
    private Long warehouseId;
    private BigDecimal quantity;
    private String status;
    private LocalDate executionDate;
    private String note;
    private Long createdBy;
    private java.util.List<AssemblyOrderLineRequest> lines;
}
