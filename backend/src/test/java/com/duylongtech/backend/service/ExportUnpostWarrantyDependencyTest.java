package com.duylongtech.backend.service;

import com.duylongtech.backend.enums.WarrantyStatus;
import com.duylongtech.backend.feature.einvoice.EInvoiceRepository;
import com.duylongtech.backend.feature.inventory.DependencyCheckResponse;
import com.duylongtech.backend.feature.inventory.DocumentDependencyService;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLine;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.SerialNumber;
import com.duylongtech.backend.feature.product.SerialNumberRepository;
import com.duylongtech.backend.feature.repair.RepairRepository;
import com.duylongtech.backend.feature.warranty.Warranty;
import com.duylongtech.backend.feature.warranty.WarrantyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Ghi sổ phiếu xuất bán tự sinh bảo hành cho serial. Trước đây chính bảo hành đó chặn luôn việc bỏ ghi sổ
 * ("Serial đã được đăng ký Bảo hành"); giờ bảo hành tự sinh của phiếu bị hủy cùng lúc bỏ ghi sổ nên không còn
 * là ràng buộc, trừ khi đã có lệnh sửa chữa dùng đến nó.
 */
class ExportUnpostWarrantyDependencyTest {

    private static final long DOC_ID = 10L;
    private static final long SERIAL_ID = 77L;

    private final InventoryDocumentRepository documentRepository = mock(InventoryDocumentRepository.class);
    private final SerialNumberRepository serialNumberRepository = mock(SerialNumberRepository.class);
    private final EInvoiceRepository eInvoiceRepository = mock(EInvoiceRepository.class);
    private final WarrantyRepository warrantyRepository = mock(WarrantyRepository.class);
    private final RepairRepository repairRepository = mock(RepairRepository.class);

    @BeforeEach
    void setUp() {
        InventoryDocumentLine line = new InventoryDocumentLine();
        line.setVariantId(2L);
        line.setSerialNumbersText("SN-001");
        InventoryDocument doc = mock(InventoryDocument.class);
        when(doc.getStatus()).thenReturn("POSTED");
        when(doc.getLines()).thenReturn(List.of(line));
        when(documentRepository.findById(DOC_ID)).thenReturn(Optional.of(doc));

        SerialNumber serial = mock(SerialNumber.class);
        when(serial.getId()).thenReturn(SERIAL_ID);
        when(serialNumberRepository.findByVariantIdAndSerialNumber(2L, "SN-001")).thenReturn(Optional.of(serial));
        when(eInvoiceRepository.findFirstByInventoryDocumentIdAndStatusNot(anyLong(), any())).thenReturn(Optional.empty());
    }

    private DocumentDependencyService newService() {
        return new DocumentDependencyService(documentRepository, mock(InventoryBalanceRepository.class),
                serialNumberRepository, mock(ProductVariantRepository.class), eInvoiceRepository,
                warrantyRepository, repairRepository);
    }

    private static Warranty ownWarranty() {
        Warranty warranty = new Warranty();
        warranty.setId(5L);
        warranty.setWarrantyCode("BH00005");
        warranty.setExportSlipId(DOC_ID);
        warranty.setWarrantyStatus(WarrantyStatus.ACTIVE.name());
        return warranty;
    }

    @Test
    void ownAutoWarrantyNoLongerBlocksUnpost() {
        when(warrantyRepository.existsOtherWarrantyForSerial(SERIAL_ID, DOC_ID)).thenReturn(false);
        when(warrantyRepository.findByExportSlipIdAndWarrantyStatusNot(DOC_ID, WarrantyStatus.VOIDED.name()))
                .thenReturn(List.of(ownWarranty()));
        when(repairRepository.existsByWarrantyIdIn(List.of(5L))).thenReturn(false);

        DependencyCheckResponse result = newService().checkExportSlipUnpostable(DOC_ID);

        assertTrue(result.isCanUnpost());
    }

    @Test
    void warrantyFromAnotherSlipStillBlocksUnpost() {
        when(warrantyRepository.existsOtherWarrantyForSerial(SERIAL_ID, DOC_ID)).thenReturn(true);
        when(warrantyRepository.findByExportSlipIdAndWarrantyStatusNot(DOC_ID, WarrantyStatus.VOIDED.name()))
                .thenReturn(List.of());

        assertFalse(newService().checkExportSlipUnpostable(DOC_ID).isCanUnpost());
    }

    @Test
    void ownWarrantyAlreadyUsedByARepairBlocksUnpost() {
        when(warrantyRepository.existsOtherWarrantyForSerial(SERIAL_ID, DOC_ID)).thenReturn(false);
        when(warrantyRepository.findByExportSlipIdAndWarrantyStatusNot(DOC_ID, WarrantyStatus.VOIDED.name()))
                .thenReturn(List.of(ownWarranty()));
        when(repairRepository.existsByWarrantyIdIn(List.of(5L))).thenReturn(true);

        DependencyCheckResponse result = newService().checkExportSlipUnpostable(DOC_ID);

        assertFalse(result.isCanUnpost());
        assertTrue(result.getConflictingDocuments().contains("BH00005"));
    }
}
