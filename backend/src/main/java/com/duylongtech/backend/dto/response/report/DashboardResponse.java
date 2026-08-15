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
    private BigDecimal standardWarehouseInventoryValue;
    
    // UC 82 Additional Metrics
    private BigDecimal totalImportThisMonth;
    private BigDecimal totalExportThisMonth;
    private BigDecimal totalCustomerDebt;
    private BigDecimal totalSupplierDebt;
    private Integer newWarrantyTickets;
    private Integer approvedPurchaseOrdersCount;
    private Integer approvedSalesOrdersCount;
    private Integer backorderedSalesOrdersCount;
    private Integer configuredLowStockProductsCount;
    private Integer confirmedWarrantyRepairsCount;
    
    private List<LowStockItemDto> lowStockItems;
    private List<InventoryValueDto> inventoryValues;
    private List<RecentActivityDto> recentActivities;
    private List<FinishedGoodInventoryDto> finishedGoodInventoryItems;
    private List<OrderSummaryDto> approvedPurchaseOrders;
    private List<OrderSummaryDto> approvedSalesOrders;
    private List<OrderSummaryDto> backorderedSalesOrders;
    private List<ConfiguredLowStockProductDto> configuredLowStockProducts;
    private List<RepairSummaryDto> confirmedWarrantyRepairs;
    private List<InventoryFlowDto> inventoryFlow7Days;
    private List<CategoryInventoryDto> categoryInventoryBreakdown;
    private List<FinanceOverviewDto> financeOverview;
    private List<RecentTransactionDto> recentTransactions;
    
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

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FinishedGoodInventoryDto {
        private Long variantId;
        private String productCode;
        private String productName;
        private String sku;
        private String variantName;
        private String unitName;
        private BigDecimal quantity;
        private BigDecimal inventoryValue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderSummaryDto {
        private Long id;
        private String code;
        private java.time.LocalDate documentDate;
        private String partnerName;
        private String warehouseName;
        private BigDecimal totalAmount;
        private String status;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConfiguredLowStockProductDto {
        private Long productId;
        private String productCode;
        private String productName;
        private String productType;
        private String unitName;
        private BigDecimal stockQty;
        private BigDecimal minStockQty;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RepairSummaryDto {
        private Long id;
        private String repairCode;
        private java.time.LocalDate receivedDate;
        private String partnerName;
        private String productName;
        private String repairStatus;
        private Boolean underWarranty;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InventoryFlowDto {
        private String label;
        private BigDecimal importQuantity;
        private BigDecimal exportQuantity;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryInventoryDto {
        private String categoryName;
        private BigDecimal inventoryValue;
        private BigDecimal percentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FinanceOverviewDto {
        private String label;
        private BigDecimal receipts;
        private BigDecimal vouchers;
        private BigDecimal closingDebt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentTransactionDto {
        private String entityType;
        private Long entityId;
        private String code;
        private String transactionType;
        private String partnerName;
        private String status;
        private java.time.LocalDateTime createdAt;
    }
}
