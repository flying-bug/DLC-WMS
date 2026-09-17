package com.duylongtech.backend.feature.einvoice;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EInvoiceAdjustRequest {
    @NotBlank(message = "Lý do điều chỉnh hóa đơn không được để trống")
    private String reason;

    @NotBlank(message = "Vui lòng chọn loại điều chỉnh")
    private String adjustmentType; // INFO, INCREASE, DECREASE

    // Dùng khi adjustmentType = INFO
    private String buyerName;
    private String buyerLegalName;
    private String buyerTaxCode;
    private String buyerAddress;
    private String buyerPhone;
    private String buyerEmail;

    // Dùng khi adjustmentType = INCREASE / DECREASE (luôn là giá trị dương, dấu được suy ra từ adjustmentType)
    private BigDecimal adjustSubTotalAmount;
    private BigDecimal adjustVatAmount;
}
