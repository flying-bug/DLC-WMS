package com.duylongtech.backend.dto.response.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    private Integer lowStockItemsCount;
    private Integer outOfStockItemsCount;
    private BigDecimal inventoryTurnoverRatio;
    private BigDecimal averageDaysInInventory;
    private BigDecimal totalInventoryValue;
    
    // UC 82 Additional Metrics
    private BigDecimal totalImportThisMonth;
    private BigDecimal totalExportThisMonth;
    private BigDecimal totalCustomerDebt;
    private BigDecimal totalSupplierDebt;
    private Integer newWarrantyTickets;
    
    private List<LowStockItemDto> lowStockItems;
    private List<InventoryValueDto> inventoryValues;
    private List<RecentActivityDto> recentActivities;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LowStockItemDto {
        private String warehouseName;
        private String productName;
        private BigDecimal currentStockQuantity;
        private BigDecimal minimumStockLevel;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InventoryValueDto {
        private String productName;
        private BigDecimal quantity;
        private BigDecimal inventoryValue;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentActivityDto {
        private String action;
        private String description;
        private String user;
        private java.time.LocalDateTime timestamp;
    }
}
