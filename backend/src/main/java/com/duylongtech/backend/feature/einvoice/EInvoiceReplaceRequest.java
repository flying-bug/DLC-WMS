package com.duylongtech.backend.feature.einvoice;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EInvoiceReplaceRequest {
    @NotBlank(message = "Lý do thay thế hóa đơn không được để trống")
    private String reason;

    private String buyerName;
    private String buyerLegalName;
    private String buyerTaxCode;
    private String buyerAddress;
    private String buyerPhone;
    private String buyerEmail;
}
