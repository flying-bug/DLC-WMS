package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class RepairFeeResponse {
    private Long id;
    private Long repairId;
    private String feeName;
    private BigDecimal feeAmount;
    private Boolean isFreeWarranty;
    private String note;
}
