package com.duylongtech.backend.service;

import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.assembly.AssemblyBomRepository;
import com.duylongtech.backend.feature.assembly.AssemblyOrderRepository;
import com.duylongtech.backend.feature.assembly.AssemblyOrderSerialRepository;
import com.duylongtech.backend.feature.assembly.DeviceComponentSerialRepository;
import com.duylongtech.backend.feature.audit.AuditLogService;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.inventory.DocumentDependencyService;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryCostLayerRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLine;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineResponse;
import com.duylongtech.backend.feature.inventory.InventoryDocumentMapper;
import com.duylongtech.backend.feature.inventory.InventoryDocumentReferenceRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentResponse;
import com.duylongtech.backend.feature.inventory.InventoryDocumentService;
import com.duylongtech.backend.feature.inventory.InventoryLedgerRepository;
import com.duylongtech.backend.feature.inventory.InventoryPostingService;
import com.duylongtech.backend.feature.inventory.InventoryValidationService;
import com.duylongtech.backend.feature.inventory.StockReservationRepository;
import com.duylongtech.backend.feature.notification.AppNotificationService;
import com.duylongtech.backend.feature.partner.PartnerLedgerService;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.ProductRepository;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.SerialNumberRepository;
import com.duylongtech.backend.feature.product.UnitRepository;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderRepository;
import com.duylongtech.backend.feature.repair.RepairRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderService;
import com.duylongtech.backend.feature.stocktake.StocktakeRepository;
import com.duylongtech.backend.feature.system.CodeGeneratorService;
import com.duylongtech.backend.feature.warehouse.WarehouseAccessGuard;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import com.duylongtech.backend.feature.warranty.WarrantyLifecycleService;
import com.duylongtech.backend.feature.warranty.WarrantyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Phiếu xuất nháp của phiếu chuyển kho: màn phiếu kho gọi updateExport (kèm issuePurpose=TRANSFER_EXPORT) trước khi
 * ghi sổ, nhưng updateExport chỉ nhận mục đích thủ công nên báo "Mục đích xuất kho không hợp lệ" và không ghi sổ được.
 * Giờ phiếu do hệ thống sinh được cập nhật, và giữ nguyên mục đích / chứng từ gốc để luồng chuyển kho còn nhận ra nó.
 */
class TransferExportUpdateTest {

    private static final long DOC_ID = 52L;
    private static final long TRANSFER_ID = 3L;

    private InventoryDocumentRepository documentRepository;
    private InventoryDocumentService service;
    private InventoryDocument doc;

    @BeforeEach
    void setUp() {
        documentRepository = mock(InventoryDocumentRepository.class);
        InventoryDocumentMapper mapper = mock(InventoryDocumentMapper.class);
        when(mapper.toResponse(any(InventoryDocument.class))).thenReturn(new InventoryDocumentResponse());
        when(mapper.toLineResponse(any(InventoryDocumentLine.class))).thenAnswer(inv -> new InventoryDocumentLineResponse());
        service = new InventoryDocumentService(
                mock(CodeGeneratorService.class), mapper, documentRepository,
                mock(InventoryDocumentLineRepository.class), mock(InventoryBalanceRepository.class),
                mock(InventoryCostLayerRepository.class), mock(InventoryValidationService.class),
                mock(InventoryPostingService.class), mock(WarehouseAccessGuard.class),
                mock(InventoryLedgerRepository.class), mock(SerialNumberRepository.class),
                mock(PartnerLedgerService.class), mock(ProductVariantRepository.class), mock(WarrantyRepository.class),
                mock(WarrantyLifecycleService.class), mock(PartnerRepository.class),
                mock(AssemblyOrderSerialRepository.class), mock(UserRepository.class), mock(ProductRepository.class),
                mock(AssemblyOrderRepository.class), mock(AssemblyBomRepository.class),
                mock(DeviceComponentSerialRepository.class), mock(StocktakeRepository.class),
                mock(SalesOrderRepository.class), mock(RepairRepository.class), mock(PurchaseOrderRepository.class),
                mock(SalesOrderService.class), mock(StockReservationRepository.class), mock(WarehouseRepository.class),
                mock(UnitRepository.class), mock(AppNotificationService.class), mock(DocumentDependencyService.class),
                mock(AuditLogService.class), mock(InventoryDocumentReferenceRepository.class));

        doc = exportDoc(InventoryDocumentService.ISSUE_PURPOSE_TRANSFER_OUT, "STOCK_TRANSFER", TRANSFER_ID);
        when(documentRepository.findExportByIdWithLines(DOC_ID)).thenAnswer(inv -> Optional.of(doc));
        when(documentRepository.save(any(InventoryDocument.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static InventoryDocument exportDoc(String issuePurpose, String referenceType, Long referenceId) {
        InventoryDocument document = new InventoryDocument();
        document.initExportDocument("XK00052");
        document.updateStatus("DRAFT");
        document.setId(DOC_ID);
        document.setIssuePurpose(issuePurpose);
        document.setReferenceType(referenceType);
        document.setReferenceId(referenceId);
        document.setWarehouseId(1L);
        InventoryDocumentLine line = new InventoryDocumentLine();
        line.setVariantId(67L);
        line.setWarehouseId(1L);
        line.setQuantityOut(BigDecimal.ONE);
        document.addExportLine(line);
        return document;
    }

    private static InventoryDocumentRequest request(String issuePurpose, String referenceType, Long referenceId) {
        InventoryDocumentLineRequest line = new InventoryDocumentLineRequest();
        line.setVariantId(67L);
        line.setWarehouseId(1L);
        line.setQuantityOut(BigDecimal.ONE);
        InventoryDocumentRequest req = new InventoryDocumentRequest();
        req.setWarehouseId(1L);
        req.setDocDate(LocalDate.of(2026, 9, 24));
        req.setIssuePurpose(issuePurpose);
        req.setReferenceType(referenceType);
        req.setReferenceId(referenceId);
        req.setNote("Chuyển kho CK-00004");
        req.setLines(List.of(line));
        return req;
    }

    @Test
    void warehouseKeeperCanSaveTheTransferExportBeforePosting() {
        service.updateExport(DOC_ID, request("TRANSFER_EXPORT", "STOCK_TRANSFER", TRANSFER_ID));

        assertEquals("TRANSFER_EXPORT", doc.getIssuePurpose());
        assertEquals("STOCK_TRANSFER", doc.getReferenceType());
        assertEquals(TRANSFER_ID, doc.getReferenceId());
        verify(documentRepository).save(doc);
    }

    @Test
    void transferLinkIsKeptEvenWhenTheScreenDoesNotSendIt() {
        service.updateExport(DOC_ID, request(null, null, null));

        assertEquals("TRANSFER_EXPORT", doc.getIssuePurpose());
        assertEquals("STOCK_TRANSFER", doc.getReferenceType());
        assertEquals(TRANSFER_ID, doc.getReferenceId());
    }

    @Test
    void transferExportCannotBeTurnedIntoAManualExport() {
        assertThrows(BusinessException.class,
                () -> service.updateExport(DOC_ID, request("SALES", "STOCK_TRANSFER", TRANSFER_ID)));
        verify(documentRepository, never()).save(any(InventoryDocument.class));
    }

    @Test
    void manualExportStillCannotBeSwitchedToASystemPurpose() {
        doc = exportDoc("SALES", null, null);

        assertThrows(BusinessException.class,
                () -> service.updateExport(DOC_ID, request("TRANSFER_EXPORT", "STOCK_TRANSFER", TRANSFER_ID)));
        verify(documentRepository, never()).save(any(InventoryDocument.class));
    }
}
