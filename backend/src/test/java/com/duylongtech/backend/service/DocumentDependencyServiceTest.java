package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.response.DependencyCheckResponse;
import com.duylongtech.backend.entity.*;
import com.duylongtech.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DocumentDependencyServiceTest {

    @Mock private InventoryDocumentRepository documentRepository;
    @Mock private SerialNumberRepository serialNumberRepository;
    @Mock private InventoryBalanceRepository balanceRepository;
    @Mock private ProductVariantRepository variantRepository;

    @InjectMocks
    private DocumentDependencyService service;

    private InventoryDocument sampleImportDoc;
    private InventoryDocumentLine sampleImportLine;

    @BeforeEach
    void setUp() {
        sampleImportLine = InventoryDocumentLine.builder()
                .id(101L)
                .variantId(501L)
                .quantityIn(BigDecimal.valueOf(5))
                .serialNumbersText("SN-01,SN-02")
                .build();

        sampleImportDoc = InventoryDocument.builder()
                .id(1L)
                .docCode("NK00001")
                .docType("IN_PO")
                .status("POSTED")
                .warehouseId(10L)
                .lines(List.of(sampleImportLine))
                .build();
    }

    @Test
    @DisplayName("checkImportSlipUnpostable - Trả về canUnpost=true khi tồn kho đủ và serial chưa xuất bán")
    void checkImportSlipUnpostable_safe_returnsCanUnpostTrue() {
        when(documentRepository.findById(1L)).thenReturn(Optional.of(sampleImportDoc));
        when(balanceRepository.sumQuantityOnHandByWarehouseIdAndVariantId(10L, 501L))
                .thenReturn(BigDecimal.valueOf(10));

        SerialNumber sn1 = SerialNumber.builder().serialNumber("SN-01").variantId(501L).status("AVAILABLE").build();
        SerialNumber sn2 = SerialNumber.builder().serialNumber("SN-02").variantId(501L).status("AVAILABLE").build();
        when(serialNumberRepository.findByVariantIdAndSerialNumber(501L, "SN-01")).thenReturn(Optional.of(sn1));
        when(serialNumberRepository.findByVariantIdAndSerialNumber(501L, "SN-02")).thenReturn(Optional.of(sn2));

        DependencyCheckResponse res = service.checkImportSlipUnpostable(1L);

        assertNotNull(res);
        assertTrue(res.isCanUnpost());
        assertEquals("CLEAN", res.getLevel());
        assertTrue(res.getDetails() != null ? res.getDetails().isEmpty() : true);
    }

    @Test
    @DisplayName("checkImportSlipUnpostable - Trả về canUnpost=false khi serial đã bị bán hoặc dùng lắp ráp")
    void checkImportSlipUnpostable_serialSold_returnsBlockingDependency() {
        when(documentRepository.findById(1L)).thenReturn(Optional.of(sampleImportDoc));
        when(balanceRepository.sumQuantityOnHandByWarehouseIdAndVariantId(10L, 501L))
                .thenReturn(BigDecimal.valueOf(10));

        SerialNumber sn1 = SerialNumber.builder().serialNumber("SN-01").variantId(501L).status("SOLD").build();
        when(serialNumberRepository.findByVariantIdAndSerialNumber(501L, "SN-01")).thenReturn(Optional.of(sn1));

        DependencyCheckResponse res = service.checkImportSlipUnpostable(1L);

        assertNotNull(res);
        assertFalse(res.isCanUnpost());
        assertFalse(res.getConflictingSerials().isEmpty());
        assertTrue(res.getConflictingSerials().contains("SN-01"));
    }

    @Test
    @DisplayName("checkImportSlipUnpostable - Trả về canUnpost=false khi tồn kho hiện tại nhỏ hơn số lượng đã nhập")
    void checkImportSlipUnpostable_insufficientStock_returnsBlockingDependency() {
        when(documentRepository.findById(1L)).thenReturn(Optional.of(sampleImportDoc));
        when(balanceRepository.sumQuantityOnHandByWarehouseIdAndVariantId(10L, 501L))
                .thenReturn(BigDecimal.valueOf(2)); // Nhập 5 mà tồn chỉ còn 2

        DependencyCheckResponse res = service.checkImportSlipUnpostable(1L);

        assertNotNull(res);
        assertFalse(res.isCanUnpost());
        assertFalse(res.getDetails().isEmpty());
    }
}
