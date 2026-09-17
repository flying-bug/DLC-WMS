package com.duylongtech.backend.feature.einvoice;

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
     * Phát hành hóa đơn thay thế cho hóa đơn đã có sai sót (Điều 19 NĐ 123/2020/NĐ-CP).
     */
    EInvoiceProviderResult replaceInvoice(EInvoiceProviderData data, String originalInvoiceSeries, String originalInvoiceNumber, String originalTransactionUuid);

    /**
     * Phát hành hóa đơn điều chỉnh (thông tin / tăng / giảm) cho hóa đơn đã phát hành.
     */
    EInvoiceProviderResult adjustInvoice(EInvoiceProviderData data, String originalInvoiceSeries, String originalInvoiceNumber, String originalTransactionUuid, String adjustmentType);

    /**
     * Lấy dữ liệu file PDF của hóa đơn (Base64 hoặc byte[]).
     */
    byte[] getInvoicePdf(String invoiceSeries, String invoiceNumber, String transactionUuid);

    /**
     * Lấy URL xem hóa đơn trực tuyến.
     */
    String getViewUrl(String invoiceSeries, String invoiceNumber, String transactionUuid);
}
