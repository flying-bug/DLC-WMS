package com.duylongtech.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EInvoiceResponse {
    private Long id;
    private Long salesOrderId;
    private String soCode;
    private Long inventoryDocumentId;
    private String exportDocCode;
    private Long partnerId;
    private String partnerCode;
    private String partnerName;

    // Hóa đơn info
    private String invoiceType;
    private String templateCode;
    private String invoiceSeries;
    private String invoiceNumber;
    private LocalDate invoiceDate;
    private LocalDateTime issuedAt;
    private String status; // DRAFT, ISSUED, CANCELED, REPLACED, ADJUSTED

    // Buyer info
    private String buyerName;
    private String buyerLegalName;
    private String buyerTaxCode;
    private String buyerAddress;
    private String buyerPhone;
    private String buyerEmail;

    // Amounts
    private String currencyCode;
    private BigDecimal exchangeRate;
    private String paymentMethod;
    private BigDecimal subTotalAmount;
    private BigDecimal vatAmount;
    private BigDecimal totalAmount;
    private String totalAmountInWords;

    // CQT & System
    private String cqtCode;
    private String cqtStatus;
    private String transactionUuid;
    private String provider;

    // Links & Content
    private String viewUrl;
    private String pdfUrl;
    private String cancelReason;
    private LocalDateTime canceledAt;
    private Long canceledBy;
    private String canceledByName;

    // Audit
    private Long createdBy;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
