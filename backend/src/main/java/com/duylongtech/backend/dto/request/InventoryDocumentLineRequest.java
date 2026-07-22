package com.duylongtech.backend.dto.request;

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
    private BigDecimal vatPercent;
}
