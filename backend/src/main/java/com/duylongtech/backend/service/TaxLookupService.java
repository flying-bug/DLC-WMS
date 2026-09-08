package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.response.TaxLookupResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Slf4j
@Service
public class TaxLookupService {

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Tra cứu thông tin doanh nghiệp từ Mã số thuế
     */
    public TaxLookupResponse lookupTaxCode(String rawTaxCode) {
        if (rawTaxCode == null || rawTaxCode.trim().isEmpty()) {
            return TaxLookupResponse.builder()
                    .success(false)
                    .message("Mã số thuế không được để trống")
                    .build();
        }

        String taxCode = rawTaxCode.replaceAll("[^0-9-]", "").trim();
        log.info("[TaxLookupService] Looking up tax code: {}", taxCode);

        // Nguồn 1: VietQR Business API (Cực nhanh và cập nhật dữ liệu CQT)
        try {
            String url = "https://api.vietqr.io/v2/business/" + taxCode;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map body = response.getBody();

            if (body != null && "00".equals(body.get("code")) && body.get("data") != null) {
                Map data = (Map) body.get("data");
                String name = String.valueOf(data.getOrDefault("name", ""));
                String shortName = String.valueOf(data.getOrDefault("shortName", ""));
                String address = String.valueOf(data.getOrDefault("address", ""));

                return TaxLookupResponse.builder()
                        .success(true)
                        .taxCode(taxCode)
                        .name(name)
                        .shortName(shortName)
                        .address(address)
                        .status("ACTIVE")
                        .rawStatusText("Đang hoạt động")
                        .message("Tra cứu thành công")
                        .build();
            }
        } catch (Exception e) {
            log.warn("[TaxLookupService] VietQR lookup failed for {}: {}", taxCode, e.getMessage());
        }

        // Nguồn 2: XInvoice / Backup Open Tax API
        try {
            String url = "https://api.xinvoice.vn/invoice-api/tax-code/" + taxCode;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map body = response.getBody();

            if (body != null && body.get("data") != null) {
                Map data = (Map) body.get("data");
                return TaxLookupResponse.builder()
                        .success(true)
                        .taxCode(taxCode)
                        .name(String.valueOf(data.getOrDefault("name", "")))
                        .address(String.valueOf(data.getOrDefault("address", "")))
                        .representative(String.valueOf(data.getOrDefault("representative", "")))
                        .status("ACTIVE")
                        .rawStatusText("Đang hoạt động")
                        .message("Tra cứu thành công")
                        .build();
            }
        } catch (Exception e) {
            log.warn("[TaxLookupService] XInvoice lookup failed for {}: {}", taxCode, e.getMessage());
        }

        return TaxLookupResponse.builder()
                .success(false)
                .taxCode(taxCode)
                .message("Không tìm thấy thông tin doanh nghiệp với mã số thuế này hoặc dịch vụ tra cứu tạm thời gián đoạn.")
                .build();
    }
}
