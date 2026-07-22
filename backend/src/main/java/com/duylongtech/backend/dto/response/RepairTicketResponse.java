package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class RepairTicketResponse {
    private Long id;
    private String repairCode;
    private Long warrantyId;
    private String warrantyCode;
    private Long partnerId;
    private String partnerName;
    private String partnerPhone;
    private Long serialNumberId;
    private String serialNumber;
    private String serialStatus;
    private String sku;
    private String productName;
    private LocalDate receivedDate;
    private LocalDate expectedDate;
    private LocalDate completedDate;
    private String repairStatus;
    private String issueDescription;
    private String diagnosisNote;
    private String resolutionNote;
    private BigDecimal repairCost;
    private String note;
    private Long createdBy;
    private java.util.List<RepairLineResponse> repairLines;
}
