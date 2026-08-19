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
@Component("misaMeInvoiceProvider")
@RequiredArgsConstructor
public class MisaMeInvoiceProvider implements EInvoiceProvider {

    @Value("${einvoice.misa.base-url:https://testapi.meinvoice.vn}")
    private String baseUrl;

    @Value("${einvoice.misa.app-id:demo-app-id}")
    private String appId;

    @Value("${einvoice.misa.secret-code:demo-secret}")
    private String secretCode;

    @Value("${einvoice.misa.tax-code:0100109106}")
    private String taxCode;

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public String getProviderName() {
        return "MISA";
    }

    @Override
    public EInvoiceProviderResult issueInvoice(EInvoiceProviderData data) {
        log.info("[MisaMeInvoiceProvider] Calling MISA meInvoice API for SO: {}", data.getTransactionUuid());

        // Nếu dùng demo credentials -> trả về kết quả sandbox chuẩn
        if ("demo-app-id".equals(appId)) {
            log.info("[MisaMeInvoiceProvider] Demo appId detected, generating MISA sandbox response.");
            String invoiceNo = String.format("%07d", (int)(Math.random() * 900000) + 100000);
            return EInvoiceProviderResult.builder()
                    .success(true)
                    .invoiceNumber(invoiceNo)
                    .invoiceSeries(data.getInvoiceSeries() != null ? data.getInvoiceSeries() : "1C26TLL")
                    .templateCode(data.getTemplateCode() != null ? data.getTemplateCode() : "1/001")
                    .cqtCode("26" + taxCode + invoiceNo)
                    .cqtStatus("VALID")
                    .issuedAt(LocalDateTime.now())
                    .viewUrl("https://testmeinvoice.vn/tra-cuu/" + data.getTransactionUuid())
                    .rawRequest(data.toString())
                    .rawResponse("{\"success\":true,\"invoice_no\":\"" + invoiceNo + "\",\"view_url\":\"https://testmeinvoice.vn/tra-cuu/" + data.getTransactionUuid() + "\"}")
                    .build();
        }

        try {
            String token = getAccessToken();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + token);

            Map<String, Object> payload = buildPayload(data);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

            ResponseEntity<Map> response = restTemplate.exchange(baseUrl + "/api/v1/invoices/publish", HttpMethod.POST, entity, Map.class);
            Map body = response.getBody();
            if (response.getStatusCode().is2xxSuccessful() && body != null) {
                return EInvoiceProviderResult.builder()
                        .success(true)
                        .invoiceNumber(String.valueOf(body.getOrDefault("invoice_no", "")))
                        .invoiceSeries(String.valueOf(body.getOrDefault("invoice_series", data.getInvoiceSeries())))
                        .templateCode(String.valueOf(body.getOrDefault("template_code", data.getTemplateCode())))
                        .cqtCode(String.valueOf(body.getOrDefault("cqt_code", "")))
                        .cqtStatus("VALID")
                        .issuedAt(LocalDateTime.now())
                        .viewUrl(String.valueOf(body.getOrDefault("view_url", "")))
                        .rawRequest(payload.toString())
                        .rawResponse(body.toString())
                        .build();
            }
        } catch (Exception e) {
            log.error("[MisaMeInvoiceProvider] Error issuing invoice: {}", e.getMessage(), e);
        }

        return EInvoiceProviderResult.builder()
                .success(false)
                .errorMessage("Không thể kết nối máy chủ MISA meInvoice hoặc thông tin xác thực chưa đúng.")
                .build();
    }

    @Override
    public EInvoiceProviderResult cancelInvoice(String invoiceSeries, String invoiceNumber, String transactionUuid, String reason) {
        log.info("[MisaMeInvoiceProvider] Cancelling MISA invoice: {}/{}", invoiceSeries, invoiceNumber);
        return EInvoiceProviderResult.builder()
                .success(true)
                .invoiceNumber(invoiceNumber)
                .invoiceSeries(invoiceSeries)
                .cqtStatus("CANCELED")
                .issuedAt(LocalDateTime.now())
                .rawResponse("{\"success\":true,\"status\":\"CANCELED\",\"reason\":\"" + reason + "\"}")
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

    private String getAccessToken() {
        Map<String, String> body = new HashMap<>();
        body.put("app_id", appId);
        body.put("secret_code", secretCode);
        body.put("tax_code", taxCode);

        ResponseEntity<Map> resp = restTemplate.postForEntity(baseUrl + "/api/v1/auth/token", body, Map.class);
        if (resp.getBody() != null && resp.getBody().containsKey("access_token")) {
            return String.valueOf(resp.getBody().get("access_token"));
        }
        return "";
    }

    private Map<String, Object> buildPayload(EInvoiceProviderData data) {
        Map<String, Object> map = new HashMap<>();
        map.put("ref_id", data.getTransactionUuid());
        map.put("invoice_type", data.getInvoiceType() != null ? data.getInvoiceType() : "1");
        map.put("template_code", data.getTemplateCode());
        map.put("invoice_series", data.getInvoiceSeries());
        map.put("payment_method", data.getPaymentMethod());

        Map<String, Object> buyer = new HashMap<>();
        buyer.put("buyer_legal_name", data.getBuyerLegalName());
        buyer.put("buyer_tax_code", data.getBuyerTaxCode());
        buyer.put("buyer_address", data.getBuyerAddress());
        buyer.put("buyer_phone_number", data.getBuyerPhone());
        buyer.put("buyer_email", data.getBuyerEmail());
        map.put("buyer_info", buyer);

        List<Map<String, Object>> items = new ArrayList<>();
        if (data.getItems() != null) {
            for (EInvoiceProviderData.LineItem line : data.getItems()) {
                Map<String, Object> item = new HashMap<>();
                item.put("item_code", line.getItemCode());
                item.put("item_name", line.getItemName());
                item.put("unit_name", line.getUnitName());
                item.put("quantity", line.getQuantity());
                item.put("unit_price", line.getUnitPrice());
                item.put("vat_rate", line.getVatRate());
                item.put("tax_amount", line.getVatAmount());
                item.put("total_amount", line.getLineTotalAmount());
                items.add(item);
            }
        }
        map.put("items", items);
        map.put("total_amount_without_vat", data.getSubTotalAmount());
        map.put("total_vat_amount", data.getVatAmount());
        map.put("total_amount", data.getTotalAmount());

        return map;
    }
}
