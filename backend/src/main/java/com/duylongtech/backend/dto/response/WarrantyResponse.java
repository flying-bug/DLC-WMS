package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class WarrantyResponse {
    private Long id;
    private String warrantyCode;
    private Long serialNumberId;
    private Long partnerId;
    private Long salesOrderId;
    private LocalDate startDate;
    private LocalDate endDate;
    private String warrantyStatus;
    private String note;
}
