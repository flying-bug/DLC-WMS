package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO cho dòng phí dịch vụ trong Lệnh Sửa Chữa.
 */
@Data
@Builder
public class RepairFeeResponse {

    private Long id;
    private Long repairId;

    private String feeName;
    private BigDecimal feeAmount;
    private Boolean isFreeWarranty;
    private String note;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
