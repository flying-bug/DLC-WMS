package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.DecimalMax;
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

    @DecimalMin(value = "0.00", message = "Thuế VAT phải nằm trong khoảng từ 0% đến 10%")
    @DecimalMax(value = "10.00", message = "Thuế VAT phải nằm trong khoảng từ 0% đến 10%")
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

    @DecimalMin(value = "0.00", message = "Thuế VAT phải nằm trong khoảng từ 0% đến 10%")
    @DecimalMax(value = "10.00", message = "Thuế VAT phải nằm trong khoảng từ 0% đến 10%")
    private BigDecimal vatPercent;

    private Long warehouseId;
    private Long targetWarehouseId;
}
