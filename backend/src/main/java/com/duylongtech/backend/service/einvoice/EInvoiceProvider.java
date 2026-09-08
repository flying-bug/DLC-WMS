package com.duylongtech.backend.service.einvoice;

public interface EInvoiceProvider {

    /**
     * Tên định danh của provider (VIETTEL, MISA, XINVOICE, MOCK).
     */
    String getProviderName();

    /**
     * Phát hành hóa đơn điện tử có ký số.
     */
    EInvoiceProviderResult issueInvoice(EInvoiceProviderData data);

    /**
     * Hủy hóa đơn đã phát hành.
     */
    EInvoiceProviderResult cancelInvoice(String invoiceSeries, String invoiceNumber, String transactionUuid, String reason);

    /**
     * Lấy dữ liệu file PDF của hóa đơn (Base64 hoặc byte[]).
     */
    byte[] getInvoicePdf(String invoiceSeries, String invoiceNumber, String transactionUuid);

    /**
     * Lấy URL xem hóa đơn trực tuyến.
     */
    String getViewUrl(String invoiceSeries, String invoiceNumber, String transactionUuid);
}
