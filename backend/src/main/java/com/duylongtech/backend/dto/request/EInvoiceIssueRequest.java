package com.duylongtech.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EInvoiceIssueRequest {
    private Long salesOrderId;
    private Long inventoryDocumentId;

    private String invoiceType;     // "1" (GTGT), "1M" (Máy tính tiền), default "1"
    private String templateCode;    // "1/001", "1/247"
    private String invoiceSeries;   // "1C26TLL", "1M26TLL"
    private LocalDate invoiceDate;  // Ngày lập HĐ (default hôm nay)
    private String paymentMethod;   // "TM/CK", "TM", "CK"

    // Có thể ghi đè thông tin người mua khi xuất HĐ
    private String buyerName;
    private String buyerLegalName;
    private String buyerTaxCode;
    private String buyerAddress;
    private String buyerPhone;
    private String buyerEmail;
    private String note;
}
