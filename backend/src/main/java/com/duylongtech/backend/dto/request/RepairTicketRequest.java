package com.duylongtech.backend.dto.request;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class RepairTicketRequest {
    private String repairCode;
    private Long warrantyId;
    private Long partnerId;
    private Long serialNumberId;
    private LocalDate receivedDate;
    private LocalDate expectedDate;
    private LocalDate completedDate;
    private String repairStatus;
    private String issueDescription;
    private String diagnosisNote;
    private String resolutionNote;
    private BigDecimal repairCost;
    private String note;
    private java.util.List<RepairLineRequest> repairLines;
}
