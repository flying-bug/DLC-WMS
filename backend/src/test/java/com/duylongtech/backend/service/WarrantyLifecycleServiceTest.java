package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.WarrantyLineRequest;
import com.duylongtech.backend.dto.request.WarrantyRequest;
import com.duylongtech.backend.entity.SerialNumber;
import com.duylongtech.backend.entity.Warranty;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.ProductVariantRepository;
import com.duylongtech.backend.repository.SerialNumberRepository;
import com.duylongtech.backend.repository.WarrantyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WarrantyLifecycleServiceTest {

    @Mock private WarrantyRepository warrantyRepository;
    @Mock private CodeGeneratorService codeGeneratorService;
    @Mock private SerialNumberRepository serialNumberRepository;
    @Mock private ProductVariantRepository productVariantRepository;

    private WarrantyLifecycleService service;

    @BeforeEach
    void setUp() {
        service = new WarrantyLifecycleService(
                warrantyRepository,
                codeGeneratorService,
                serialNumberRepository,
                productVariantRepository);
    }

    @Test
    void createWarranty_serialFromAnotherVariant_rejectsRequest() {
        WarrantyRequest request = request(100L, 200L, BigDecimal.ONE);
        when(serialNumberRepository.findById(100L)).thenReturn(Optional.of(
                SerialNumber.builder().id(100L).variantId(201L).build()));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> service.createWarranty(request));

        assertEquals("Serial khong thuoc SKU da chon", exception.getMessage());
    }

    @Test
    void createWarranty_serialLine_usesSerialVariantAndQuantityOne() {
        WarrantyRequest request = request(100L, null, null);
        when(serialNumberRepository.findById(100L)).thenReturn(Optional.of(
                SerialNumber.builder().id(100L).variantId(200L).build()));
        when(codeGeneratorService.generateCode("warranties", "warranty_code", "BH", 6))
                .thenReturn("BH000001");
        when(warrantyRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0, Warranty.class));

        var response = service.createWarranty(request);

        assertEquals(200L, response.getLines().get(0).getProductVariantId());
        assertEquals(0, BigDecimal.ONE.compareTo(response.getLines().get(0).getQuantity()));
    }

    private WarrantyRequest request(Long serialId, Long variantId, BigDecimal quantity) {
        WarrantyLineRequest line = new WarrantyLineRequest();
        line.setSerialNumberId(serialId);
        line.setProductVariantId(variantId);
        line.setQuantity(quantity);

        WarrantyRequest request = new WarrantyRequest();
        request.setPartnerId(10L);
        request.setStartDate(LocalDate.of(2026, 8, 28));
        request.setEndDate(LocalDate.of(2027, 8, 28));
        request.setLines(List.of(line));
        return request;
    }
}
