package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class WarrantyResponse {
    private Long id;
    private String warrantyCode;
    private Long serialNumberId;
    private String serialNumber;
    private String serialStatus;
    private String sku;
    private String productName;
    private Long partnerId;
    private String partnerName;
    private String partnerPhone;
    private String partnerEmail;
    private String partnerAddress;
    private Long salesOrderId;
    private LocalDate startDate;
    private LocalDate endDate;
    private String warrantyStatus;
    private String note;
    private Integer repairCount;
    private List<RepairSummary> repairs;

    @Data
    @Builder
    public static class RepairSummary {
        private Long id;
        private String repairCode;
        private LocalDate receivedDate;
        private String repairStatus;
        private String issueDescription;
        private java.math.BigDecimal totalAmount;
        private String responsiblePerson;
    }
}
