package com.duylongtech.backend.service;

import com.duylongtech.backend.enums.DocumentStatus;
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
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLine;
import com.duylongtech.backend.feature.inventory.InventoryDocumentMapper;
import com.duylongtech.backend.feature.inventory.InventoryDocumentReference;
import com.duylongtech.backend.feature.inventory.InventoryDocumentReferenceRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
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
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers the new "unpost cancels the old document and reissues a DRAFT clone"
 * behaviour added to InventoryDocumentService.unpostImport/unpostExport - see
 * cloneAsDraft()/linkReissuedDocument() there.
 */
class InventoryDocumentServiceUnpostReissueTest {

    private final InventoryDocumentRepository inventoryDocumentRepository = mock(InventoryDocumentRepository.class);
    private final InventoryPostingService inventoryPostingService = mock(InventoryPostingService.class);
    private final InventoryDocumentMapper inventoryDocumentMapper = mock(InventoryDocumentMapper.class);
    private final InventoryDocumentReferenceRepository inventoryDocumentReferenceRepository =
            mock(InventoryDocumentReferenceRepository.class);
    private final AtomicLong idSequence = new AtomicLong(100);

    private InventoryDocumentService newService() {
        InventoryDocumentService service = new InventoryDocumentService(
                mock(CodeGeneratorService.class),
                inventoryDocumentMapper,
                inventoryDocumentRepository,
                mock(InventoryDocumentLineRepository.class),
                mock(InventoryBalanceRepository.class),
                mock(InventoryCostLayerRepository.class),
                mock(InventoryValidationService.class),
                inventoryPostingService,
                mock(WarehouseAccessGuard.class),
                mock(InventoryLedgerRepository.class),
                mock(SerialNumberRepository.class),
                mock(PartnerLedgerService.class),
                mock(ProductVariantRepository.class),
                mock(WarrantyRepository.class),
                mock(WarrantyLifecycleService.class),
                mock(PartnerRepository.class),
                mock(AssemblyOrderSerialRepository.class),
                mock(UserRepository.class),
                mock(ProductRepository.class),
                mock(AssemblyOrderRepository.class),
                mock(AssemblyBomRepository.class),
                mock(DeviceComponentSerialRepository.class),
                mock(StocktakeRepository.class),
                mock(SalesOrderRepository.class),
                mock(RepairRepository.class),
                mock(PurchaseOrderRepository.class),
                mock(SalesOrderService.class),
                mock(StockReservationRepository.class),
                mock(WarehouseRepository.class),
                mock(UnitRepository.class),
                mock(AppNotificationService.class),
                mock(DocumentDependencyService.class),
                mock(AuditLogService.class),
                inventoryDocumentReferenceRepository
        );
        return service;
    }

    @Test
    void unpostImportCancelsOldDocumentAndReturnsANewDraftReferencingIt() {
        InventoryDocument old = new InventoryDocument();
        old.setId(10L);
        old.updateStatus(DocumentStatus.DRAFT.name());
        InventoryDocumentLine line = new InventoryDocumentLine();
        line.setVariantId(1L);
        line.setQuantityIn(new BigDecimal("5"));
        line.setUnitCost(new BigDecimal("100"));
        old.addImportLine(line);
        old.initImportDocument("NK00010");
        old.updateStatus(DocumentStatus.POSTED.name());

        // InventoryPostingService.unpostImport's own reversal logic is covered by
        // InventoryPostingServiceExportGuardTest; here we only assume it did its job
        // of flipping the document to UNPOSTED, which is the precondition
        // cancelAfterUnpost() requires.
        when(inventoryPostingService.unpostImport(10L, "Nhập sai số lượng", 999L)).thenAnswer(inv -> {
            old.updateStatus(DocumentStatus.UNPOSTED.name());
            return null;
        });
        when(inventoryDocumentRepository.findById(10L)).thenReturn(Optional.of(old));
        when(inventoryDocumentRepository.findAllImportDocCodes()).thenReturn(List.of());
        when(inventoryDocumentRepository.existsByDocCode(anyString())).thenReturn(false);
        when(inventoryDocumentRepository.save(any(InventoryDocument.class))).thenAnswer(inv -> {
            InventoryDocument doc = inv.getArgument(0);
            if (doc.getId() == null) {
                doc.setId(idSequence.getAndIncrement());
            }
            return doc;
        });
        when(inventoryDocumentReferenceRepository.findByInventoryDocumentId(any())).thenReturn(List.of());
        when(inventoryDocumentMapper.toResponse(any(InventoryDocument.class))).thenAnswer(inv -> {
            InventoryDocument doc = inv.getArgument(0);
            InventoryDocumentResponse r = new InventoryDocumentResponse();
            r.setId(doc.getId());
            r.setDocCode(doc.getDocCode());
            r.setStatus(doc.getStatus());
            return r;
        });
        when(inventoryDocumentMapper.toLineResponse(any(InventoryDocumentLine.class)))
                .thenAnswer(inv -> new com.duylongtech.backend.feature.inventory.InventoryDocumentLineResponse());

        InventoryDocumentService service = newService();
        InventoryDocumentResponse response = service.unpostImport(10L, "Nhập sai số lượng", 999L);

        // Old document becomes a permanent history record.
        assertEquals(DocumentStatus.CANCELLED.name(), old.getStatus());

        // Response describes the NEW document, not the cancelled one.
        assertNotEquals(old.getDocCode(), response.getDocCode());
        assertTrue(response.getDocCode().startsWith("NK"));
        assertEquals(DocumentStatus.DRAFT.name(), response.getStatus());

        verify(inventoryDocumentRepository, times(2)).save(any(InventoryDocument.class));
        verify(inventoryDocumentReferenceRepository, times(1)).save(argThatReferencesOldDoc(old));
    }

    @Test
    void unpostAssemblyExportKeepsTheAuthoritativeDocumentPair() {
        InventoryDocument old = new InventoryDocument();
        old.setId(20L);
        old.initExportDocument("XK00020");
        old.setReferenceType("ASSEMBLY_ORDER");
        old.setReferenceId(7L);
        old.updateStatus(DocumentStatus.POSTED.name());

        when(inventoryPostingService.unpostExport(20L, "Hủy thực hiện", 999L)).thenAnswer(inv -> {
            old.updateStatus(DocumentStatus.UNPOSTED.name());
            return null;
        });
        when(inventoryDocumentRepository.findById(20L)).thenReturn(Optional.of(old));
        when(inventoryDocumentMapper.toResponse(old)).thenAnswer(inv -> {
            InventoryDocumentResponse response = new InventoryDocumentResponse();
            response.setId(old.getId());
            response.setStatus(old.getStatus());
            return response;
        });

        InventoryDocumentResponse response = newService().unpostExport(20L, "Hủy thực hiện", 999L);

        assertEquals(20L, response.getId());
        assertEquals(DocumentStatus.UNPOSTED.name(), response.getStatus());
        verify(inventoryDocumentReferenceRepository, times(0)).save(any());
    }

    @Test
    void postedRepairDocumentCannotBeUnposted() {
        InventoryDocument document = new InventoryDocument();
        document.setId(30L);
        document.initExportDocument("XK00030");
        document.setReferenceType("REPAIR");
        document.setReferenceId(9L);
        document.updateStatus(DocumentStatus.POSTED.name());
        when(inventoryDocumentRepository.findById(30L)).thenReturn(Optional.of(document));

        assertThrows(BusinessException.class,
                () -> newService().unpostExport(30L, "Không còn được phép", 999L));

        verify(inventoryPostingService, times(0)).unpostExport(any(), any(), any());
    }

    private static InventoryDocumentReference argThatReferencesOldDoc(InventoryDocument old) {
        return org.mockito.ArgumentMatchers.argThat(ref ->
                ref != null
                        && "UNPOST_SOURCE".equals(ref.getReferenceType())
                        && old.getId().equals(ref.getReferenceDocId()));
    }
}
