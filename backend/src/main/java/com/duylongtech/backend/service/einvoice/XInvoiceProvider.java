package com.duylongtech.backend.service.einvoice;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Component("xInvoiceProvider")
@RequiredArgsConstructor
public class XInvoiceProvider implements EInvoiceProvider {

    @Value("${einvoice.xinvoice.base-url:https://api.xinvoice.vn}")
    private String baseUrl;

    @Value("${einvoice.xinvoice.client-id:demo-client-id}")
    private String clientId;

    @Value("${einvoice.xinvoice.api-key:demo-api-key}")
    private String apiKey;

    @Value("${einvoice.xinvoice.auth-token:demo-auth-token}")
    private String authToken;

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public String getProviderName() {
        return "XINVOICE";
    }

    @Override
    public EInvoiceProviderResult issueInvoice(EInvoiceProviderData data) {
        log.info("[XInvoiceProvider] Calling XInvoice API for SO: {}", data.getTransactionUuid());
        String url = baseUrl + "/invoice-api/invoice";

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("client-id", clientId);
            headers.set("api-key", apiKey);
            headers.set("Authorization", "Bearer " + authToken);

            Map<String, Object> payload = buildPayload(data);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

            // In production/demo, attempt the HTTP call; if credentials not configured, fallback with simulated response
            if ("demo-api-key".equals(apiKey)) {
                log.info("[XInvoiceProvider] Demo API key detected, generating sandbox response.");
                String invoiceNo = String.format("%07d", (int)(Math.random() * 900000) + 100000);
                return EInvoiceProviderResult.builder()
                        .success(true)
                        .invoiceNumber(invoiceNo)
                        .invoiceSeries(data.getInvoiceSeries() != null ? data.getInvoiceSeries() : "1C26TLL")
                        .templateCode(data.getTemplateCode() != null ? data.getTemplateCode() : "1/001")
                        .cqtCode("26" + (data.getSellerTaxCode() != null ? data.getSellerTaxCode() : "0100109106") + invoiceNo)
                        .cqtStatus("VALID")
                        .issuedAt(LocalDateTime.now())
                        .viewUrl("/api/v1/einvoices/preview/" + data.getTransactionUuid())
                        .pdfUrl("/api/v1/einvoices/download/" + data.getTransactionUuid())
                        .rawRequest(payload.toString())
                        .rawResponse("{\"success\":true,\"provider\":\"XINVOICE\",\"invoiceNo\":\"" + invoiceNo + "\"}")
                        .build();
            }

            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            Map body = response.getBody();
            if (response.getStatusCode().is2xxSuccessful() && body != null) {
                return EInvoiceProviderResult.builder()
                        .success(true)
                        .invoiceNumber(String.valueOf(body.getOrDefault("invoiceNumber", "")))
                        .invoiceSeries(String.valueOf(body.getOrDefault("invoiceSeries", data.getInvoiceSeries())))
                        .templateCode(String.valueOf(body.getOrDefault("templateCode", data.getTemplateCode())))
                        .cqtCode(String.valueOf(body.getOrDefault("cqtCode", "")))
                        .cqtStatus("VALID")
                        .viewUrl(String.valueOf(body.getOrDefault("viewUrl", "")))
                        .pdfUrl(String.valueOf(body.getOrDefault("pdfUrl", "")))
                        .issuedAt(LocalDateTime.now())
                        .rawRequest(payload.toString())
                        .rawResponse(body.toString())
                        .build();
            }
        } catch (Exception e) {
            log.error("[XInvoiceProvider] Error issuing invoice: {}", e.getMessage(), e);
        }

        // Fallback gracefully
        return EInvoiceProviderResult.builder()
                .success(false)
                .errorMessage("Không thể kết nối máy chủ XInvoice hoặc cấu hình API Key chưa chính xác.")
                .build();
    }

    @Override
    public EInvoiceProviderResult cancelInvoice(String invoiceSeries, String invoiceNumber, String transactionUuid, String reason) {
        log.info("[XInvoiceProvider] Cancelling invoice: {}/{}", invoiceSeries, invoiceNumber);
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
        return new byte[0];
    }

    @Override
    public String getViewUrl(String invoiceSeries, String invoiceNumber, String transactionUuid) {
        return baseUrl + "/tra-cuu/" + transactionUuid;
    }

    private Map<String, Object> buildPayload(EInvoiceProviderData data) {
        Map<String, Object> map = new HashMap<>();
        map.put("invoiceCreationType", "ISSUED");
        map.put("invoiceType", "01GTKT");
        map.put("templateCode", data.getTemplateCode());
        map.put("invoiceSeries", data.getInvoiceSeries());
        map.put("currencyCode", data.getCurrencyCode() != null ? data.getCurrencyCode() : "VND");
        map.put("adjustmentType", "1");
        map.put("paymentStatus", true);

        Map<String, Object> buyer = new HashMap<>();
        buyer.put("buyerName", data.getBuyerName());
        buyer.put("buyerLegalName", data.getBuyerLegalName());
        buyer.put("buyerTaxCode", data.getBuyerTaxCode());
        buyer.put("buyerAddressLine", data.getBuyerAddress());
        buyer.put("buyerEmail", data.getBuyerEmail());
        map.put("buyerInfo", buyer);

        List<Map<String, Object>> items = new ArrayList<>();
        if (data.getItems() != null) {
            for (EInvoiceProviderData.LineItem line : data.getItems()) {
                Map<String, Object> item = new HashMap<>();
                item.put("lineNumber", line.getLineNumber());
                item.put("itemCode", line.getItemCode());
                item.put("itemName", line.getItemName());
                item.put("unitName", line.getUnitName());
                item.put("quantity", line.getQuantity());
                item.put("unitPrice", line.getUnitPrice());
                item.put("taxRate", line.getVatRate());
                item.put("taxAmount", line.getVatAmount());
                item.put("itemTotalAmountWithoutTax", line.getLineTotalAmount());
                items.add(item);
            }
        }
        map.put("items", items);

        Map<String, Object> summarize = new HashMap<>();
        summarize.put("totalAmountWithoutTax", data.getSubTotalAmount());
        summarize.put("totalTaxAmount", data.getVatAmount());
        summarize.put("totalAmountWithTax", data.getTotalAmount());
        summarize.put("totalAmountWithTaxInWords", data.getTotalAmountInWords());
        map.put("summarizeInfo", summarize);

        return map;
    }
}
