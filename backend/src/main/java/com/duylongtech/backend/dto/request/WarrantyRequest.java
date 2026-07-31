package com.duylongtech.backend.dto.request;

import lombok.Data;

import java.time.LocalDate;

@Data
public class WarrantyRequest {
    private String warrantyCode;
    private Long partnerId;
    private Long salesOrderId;
    private LocalDate startDate;
    private LocalDate endDate;
    private String warrantyStatus;
    private String note;
    private java.util.List<WarrantyLineRequest> lines;
}
