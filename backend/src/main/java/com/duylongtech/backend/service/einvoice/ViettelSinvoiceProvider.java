package com.duylongtech.backend.service.einvoice;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Component("viettelSinvoiceProvider")
@RequiredArgsConstructor
public class ViettelSinvoiceProvider implements EInvoiceProvider {

    @Value("${einvoice.viettel.base-url:https://api-sinvoice-demo.viettel.vn}")
    private String baseUrl;

    @Value("${einvoice.viettel.username:demo_user}")
    private String username;

    @Value("${einvoice.viettel.password:demo_pass}")
    private String password;

    @Value("${einvoice.viettel.supplier-tax-code:0100109106}")
    private String supplierTaxCode;

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public String getProviderName() {
        return "VIETTEL";
    }

    @Override
    public EInvoiceProviderResult issueInvoice(EInvoiceProviderData data) {
        log.info("[ViettelSinvoiceProvider] Calling Viettel S-Invoice for SO: {}", data.getTransactionUuid());
        String url = baseUrl + "/InvoiceAPI/InvoiceWS/createInvoiceApiWithCert";

        try {
            String auth = username + ":" + password;
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Basic " + encodedAuth);

            Map<String, Object> payload = buildPayload(data);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

            if ("demo_user".equals(username)) {
                log.info("[ViettelSinvoiceProvider] Demo credentials detected, generating mock sandbox response.");
                String invoiceNo = String.format("%07d", (int)(Math.random() * 900000) + 100000);
                return EInvoiceProviderResult.builder()
                        .success(true)
                        .invoiceNumber(invoiceNo)
                        .invoiceSeries(data.getInvoiceSeries() != null ? data.getInvoiceSeries() : "1C26TLL")
                        .templateCode(data.getTemplateCode() != null ? data.getTemplateCode() : "1/001")
                        .cqtCode("26" + supplierTaxCode + invoiceNo)
                        .cqtStatus("VALID")
                        .issuedAt(LocalDateTime.now())
                        .viewUrl("https://sinvoice.viettel.vn/tra-cuu-hoa-don?id=" + data.getTransactionUuid())
                        .rawRequest(payload.toString())
                        .rawResponse("{\"result\":\"SUCCESS\",\"invoiceNo\":\"" + invoiceNo + "\"}")
                        .build();
            }

            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            Map body = response.getBody();
            if (response.getStatusCode().is2xxSuccessful() && body != null) {
                return EInvoiceProviderResult.builder()
                        .success(true)
                        .invoiceNumber(String.valueOf(body.getOrDefault("invoiceNo", "")))
                        .invoiceSeries(String.valueOf(body.getOrDefault("invoiceSeries", data.getInvoiceSeries())))
                        .templateCode(String.valueOf(body.getOrDefault("templateCode", data.getTemplateCode())))
                        .cqtCode(String.valueOf(body.getOrDefault("cqtCode", "")))
                        .cqtStatus("VALID")
                        .issuedAt(LocalDateTime.now())
                        .rawRequest(payload.toString())
                        .rawResponse(body.toString())
                        .build();
            }
        } catch (Exception e) {
            log.error("[ViettelSinvoiceProvider] Error issuing invoice: {}", e.getMessage(), e);
        }

        return EInvoiceProviderResult.builder()
                .success(false)
                .errorMessage("Không thể kết nối máy chủ Viettel S-Invoice hoặc tài khoản chưa được phân quyền.")
                .build();
    }

    @Override
    public EInvoiceProviderResult cancelInvoice(String invoiceSeries, String invoiceNumber, String transactionUuid, String reason) {
        log.info("[ViettelSinvoiceProvider] Cancelling invoice: {}/{}", invoiceSeries, invoiceNumber);
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
        return baseUrl + "/tra-cuu-hoa-don?id=" + transactionUuid;
    }

    private Map<String, Object> buildPayload(EInvoiceProviderData data) {
        Map<String, Object> map = new HashMap<>();

        Map<String, Object> general = new HashMap<>();
        general.put("invoiceType", data.getInvoiceType() != null ? data.getInvoiceType() : "1");
        general.put("templateCode", data.getTemplateCode());
        general.put("invoiceSeries", data.getInvoiceSeries());
        general.put("currencyCode", data.getCurrencyCode() != null ? data.getCurrencyCode() : "VND");
        general.put("exchangeRate", data.getExchangeRate() != null ? data.getExchangeRate() : 1.0);
        general.put("paymentType", data.getPaymentMethod() != null ? data.getPaymentMethod() : "TM/CK");
        general.put("transactionUuid", data.getTransactionUuid());
        map.put("generalInvoiceInfo", general);

        Map<String, Object> buyer = new HashMap<>();
        buyer.put("buyerName", data.getBuyerName());
        buyer.put("buyerLegalName", data.getBuyerLegalName());
        buyer.put("buyerTaxCode", data.getBuyerTaxCode());
        buyer.put("buyerAddressLine", data.getBuyerAddress());
        buyer.put("buyerPhoneNumber", data.getBuyerPhone());
        buyer.put("buyerEmail", data.getBuyerEmail());
        map.put("buyerInfo", buyer);

        Map<String, Object> seller = new HashMap<>();
        seller.put("sellerTaxCode", supplierTaxCode);
        map.put("sellerInfo", seller);

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
                item.put("taxPercentage", line.getVatRate());
                item.put("taxAmount", line.getVatAmount());
                item.put("itemTotalAmountWithoutTax", line.getLineTotalAmount());
                items.add(item);
            }
        }
        map.put("itemInfo", items);

        Map<String, Object> summarize = new HashMap<>();
        summarize.put("totalAmountWithoutTax", data.getSubTotalAmount());
        summarize.put("totalTaxAmount", data.getVatAmount());
        summarize.put("totalAmountWithTax", data.getTotalAmount());
        summarize.put("totalAmountWithTaxInWords", data.getTotalAmountInWords());
        map.put("summarizeInfo", summarize);

        return map;
    }
}
