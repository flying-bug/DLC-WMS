package com.duylongtech.backend.service.einvoice;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Component("mockEInvoiceProvider")
@RequiredArgsConstructor
public class MockEInvoiceProvider implements EInvoiceProvider {

    private static final AtomicLong INVOICE_SEQUENCE = new AtomicLong(1);
    private static final SecureRandom RANDOM = new SecureRandom();

    @Override
    public String getProviderName() {
        return "MOCK";
    }

    @Override
    public EInvoiceProviderResult issueInvoice(EInvoiceProviderData data) {
        log.info("[MockEInvoiceProvider] Issuing invoice for transaction: {}", data.getTransactionUuid());

        long nextSeq = INVOICE_SEQUENCE.getAndIncrement();
        String invoiceNumber = String.format("%07d", nextSeq);
        String invoiceSeries = data.getInvoiceSeries() != null ? data.getInvoiceSeries() : "1C26TLL";
        String templateCode = data.getTemplateCode() != null ? data.getTemplateCode() : "1/001";

        // Sinh mã CQT giả lập theo chuẩn Thông tư 91/2026/TT-BTC
        String yearCode = "26";
        String cqtCode = String.format("%s%s%s%04X", yearCode, "0100109106", invoiceNumber, RANDOM.nextInt(0xFFFF));

        LocalDateTime now = LocalDateTime.now();
        String viewUrl = "/api/v1/einvoices/preview/" + data.getTransactionUuid();

        String rawResponseJson = String.format(
                "{\"status\":\"SUCCESS\",\"provider\":\"MOCK\",\"invoiceNumber\":\"%s\",\"invoiceSeries\":\"%s\",\"cqtCode\":\"%s\",\"issuedAt\":\"%s\"}",
                invoiceNumber, invoiceSeries, cqtCode, now.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        );

        return EInvoiceProviderResult.builder()
                .success(true)
                .invoiceNumber(invoiceNumber)
                .invoiceSeries(invoiceSeries)
                .templateCode(templateCode)
                .cqtCode(cqtCode)
                .cqtStatus("VALID")
                .viewUrl(viewUrl)
                .pdfUrl("/api/v1/einvoices/download/" + data.getTransactionUuid())
                .issuedAt(now)
                .rawRequest(data.toString())
                .rawResponse(rawResponseJson)
                .build();
    }

    @Override
    public EInvoiceProviderResult cancelInvoice(String invoiceSeries, String invoiceNumber, String transactionUuid, String reason) {
        log.info("[MockEInvoiceProvider] Cancelling invoice: {}/{} - Reason: {}", invoiceSeries, invoiceNumber, reason);
        return EInvoiceProviderResult.builder()
                .success(true)
                .invoiceNumber(invoiceNumber)
                .invoiceSeries(invoiceSeries)
                .cqtStatus("CANCELED")
                .issuedAt(LocalDateTime.now())
                .rawResponse("{\"status\":\"CANCELED\",\"reason\":\"" + reason + "\"}")
                .build();
    }

    @Override
    public byte[] getInvoicePdf(String invoiceSeries, String invoiceNumber, String transactionUuid) {
        String mockPdfContent = "%PDF-1.4 Mock E-Invoice content for " + invoiceSeries + " - " + invoiceNumber;
        return mockPdfContent.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    public String getViewUrl(String invoiceSeries, String invoiceNumber, String transactionUuid) {
        return "/api/v1/einvoices/preview/" + transactionUuid;
    }
}
