package com.duylongtech.backend.feature.ocr.service;

import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.VendorProductMappingRepository;
import com.duylongtech.backend.feature.system.SystemSettingsService;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;

class ImportOcrServiceSessionLimitTest {

    private final ImportOcrService service = new ImportOcrService(
            mock(PartnerRepository.class),
            mock(ProductVariantRepository.class),
            mock(VendorProductMappingRepository.class),
            mock(SystemSettingsService.class),
            mock(PlatformTransactionManager.class));

    @Test
    void reopeningScannerKeepsOnlyNewestSessionsOfUser() {
        String first = service.initSession(7L);
        String second = service.initSession(7L);
        String third = service.initSession(7L);
        String otherUser = service.initSession(8L);

        String fourth = service.initSession(7L);

        assertNull(service.getSessionState(first));
        assertNotNull(service.getSessionState(second));
        assertNotNull(service.getSessionState(third));
        assertNotNull(service.getSessionState(fourth));
        assertNotNull(service.getSessionState(otherUser));
    }
}
