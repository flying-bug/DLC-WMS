package com.duylongtech.backend.feature.inventory;

import jakarta.validation.constraints.DecimalMin;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class InventoryDocumentLineRequest {
    private Long variantId;
    private BigDecimal quantityIn;
    private BigDecimal quantityOut;
    private BigDecimal unitCost;
    private BigDecimal unitPrice;

    @DecimalMin(value = "0.00", message = "Thuế VAT không được âm.")
    private BigDecimal vatRate;

    private BigDecimal lineAmount;
    private Long lotBatchId;
    private Long serialNumberId;
    private List<String> serialNumbers;
    private String note;
    /**
     * Thời hạn bảo hành tính theo tháng cho dòng sản phẩm này.
     * Nếu null hoặc <= 0, sản phẩm sẽ không được tạo phiếu bảo hành tự động.
     */
    private Integer warrantyMonths;

    @DecimalMin(value = "0.00", message = "Thuế VAT không được âm.")
    private BigDecimal vatPercent;

    private Long warehouseId;
    private Long targetWarehouseId;

    private BigDecimal expectedQuantity;
    private BigDecimal rejectedQuantity;
    private String discrepancyReason;

    private Long unitId;
    private Long baseUnitId;
    private String conversionOperator;
    private BigDecimal conversionRatio;
    private BigDecimal baseQuantity;
}
