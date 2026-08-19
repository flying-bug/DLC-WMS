package com.duylongtech.backend.service.einvoice;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class EInvoiceProviderFactory {

    @Value("${einvoice.active-provider:MOCK}")
    private String activeProvider;

    private final Map<String, EInvoiceProvider> providerMap;

    public EInvoiceProvider getProvider(String providerName) {
        String target = (providerName != null && !providerName.isBlank()) ? providerName.toUpperCase() : activeProvider.toUpperCase();

        switch (target) {
            case "VIETTEL":
                return providerMap.get("viettelSinvoiceProvider");
            case "MISA":
                return providerMap.get("misaMeInvoiceProvider");
            case "XINVOICE":
                return providerMap.get("xInvoiceProvider");
            case "MOCK":
            default:
                return providerMap.get("mockEInvoiceProvider");
        }
    }

    public EInvoiceProvider getActiveProvider() {
        return getProvider(activeProvider);
    }
}
