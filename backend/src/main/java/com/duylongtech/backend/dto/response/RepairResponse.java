package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class RepairResponse {
    private Long id;
    private String repairCode;
    private Long partnerId;
    private Long productId;
    private Long serialNumberId;
    private String issueDescription;
    private String repairStatus;
    private Boolean underWarranty;
    private LocalDate repairWarrantyEndDate;
    private String invoiceMethod;
    private BigDecimal totalAmount;
    private LocalDate receivedDate;
    private LocalDate expectedDate;
    private LocalDate completedDate;
    private String diagnosisNote;
    private String solutionDescription;
    private String note;
}
