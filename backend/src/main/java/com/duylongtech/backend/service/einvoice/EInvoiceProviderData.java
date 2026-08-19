package com.duylongtech.backend.service.einvoice;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EInvoiceProviderData {
    private String transactionUuid;
    private String invoiceType;
    private String templateCode;
    private String invoiceSeries;
    private LocalDate invoiceDate;
    private String paymentMethod;
    private String currencyCode;
    private BigDecimal exchangeRate;

    // Seller Info
    private String sellerTaxCode;
    private String sellerLegalName;
    private String sellerAddress;
    private String sellerPhone;
    private String sellerEmail;

    // Buyer Info
    private String buyerName;
    private String buyerLegalName;
    private String buyerTaxCode;
    private String buyerAddress;
    private String buyerPhone;
    private String buyerEmail;

    // Lines
    private List<LineItem> items;

    // Summarize
    private BigDecimal subTotalAmount;
    private BigDecimal vatAmount;
    private BigDecimal totalAmount;
    private String totalAmountInWords;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LineItem {
        private Integer lineNumber;
        private String itemCode;
        private String itemName;
        private String unitName;
        private BigDecimal quantity;
        private BigDecimal unitPrice;
        private BigDecimal vatRate; // % VAT (0, 5, 8, 10, -1 nếu không chịu thuế)
        private BigDecimal vatAmount;
        private BigDecimal lineTotalAmount;
        private String note;
    }
}
