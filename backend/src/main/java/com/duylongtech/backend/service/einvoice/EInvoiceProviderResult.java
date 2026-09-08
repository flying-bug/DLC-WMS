package com.duylongtech.backend.service.einvoice;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EInvoiceProviderResult {
    private boolean success;
    private String invoiceNumber;
    private String invoiceSeries;
    private String templateCode;
    private String cqtCode;
    private String cqtStatus; // VALID, PENDING, REJECTED
    private String viewUrl;
    private String pdfUrl;
    private String pdfBase64;
    private String xmlData;
    private LocalDateTime issuedAt;
    private String rawRequest;
    private String rawResponse;
    private String errorMessage;
}
