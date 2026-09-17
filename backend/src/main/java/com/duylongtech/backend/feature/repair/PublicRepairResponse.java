package com.duylongtech.backend.feature.repair;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class PublicRepairResponse {
    private String repairCode;
    private String customerName;
    private String productName;
    private String serialNumber;
    private String issueDescription;
    private String diagnosisNote;
    private String repairStatus;
    private LocalDate receivedDate;
    private LocalDate expectedDate;
    private BigDecimal totalPartsAmount;
    private BigDecimal totalFeesAmount;
    private BigDecimal totalVAT;
    private BigDecimal totalAmount;

    private List<PublicRepairLineDto> lines;
    private List<PublicRepairFeeDto> fees;
    private List<PublicRepairPhotoDto> photos;
    
    // Check if token is still valid
    private Boolean isTokenValid;
    private LocalDateTime tokenExpiresAt;

    @Data
    public static class PublicRepairLineDto {
        private String componentName;
        private Integer quantity;
        private String unitName;
        private BigDecimal unitPrice;
        private Integer vatPercent;
        private BigDecimal amount;
        private Boolean isFreeWarranty;
    }

    @Data
    public static class PublicRepairFeeDto {
        private String feeName;
        private Integer quantity;
        private String unitName;
        private BigDecimal feeAmount;
        private Integer vatPercent;
        private BigDecimal amount;
        private Boolean isFreeWarranty;
    }

    @Data
    public static class PublicRepairPhotoDto {
        private String phase;
        private String category;
        private String secureUrl;
        private String caption;
    }
}
