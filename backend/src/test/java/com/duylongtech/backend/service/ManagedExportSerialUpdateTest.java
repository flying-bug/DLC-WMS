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
 * Phiếu xuất tự sinh của lệnh lắp ráp được tạo không kèm serial, nên thủ kho phải chọn serial trước khi ghi sổ.
 * Trước đây updateExport chặn mọi thay đổi ("Phiếu kho tự động của lệnh kỹ thuật không được sửa trực tiếp") nên
 * phiếu không bao giờ ghi sổ được. Giờ được đổi serial, nhưng vẫn không được đổi mã hàng / số lượng / kho.
 */
class ManagedExportSerialUpdateTest {

    private static final long DOC_ID = 44L;

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

        doc = new InventoryDocument();
        doc.initExportDocument("XK00044");
        doc.updateStatus("DRAFT");
        doc.setId(DOC_ID);
        doc.setIssuePurpose("ASSEMBLY");
        doc.setReferenceType("ASSEMBLY_ORDER");
        doc.setReferenceId(8L);
        doc.setWarehouseId(1L);
        InventoryDocumentLine line = new InventoryDocumentLine();
        line.setVariantId(69L);
        line.setQuantityOut(BigDecimal.ONE);
        line.setBaseQuantity(BigDecimal.ONE);
        doc.addExportLine(line);
        when(documentRepository.findExportByIdWithLines(DOC_ID)).thenReturn(Optional.of(doc));
        when(documentRepository.save(any(InventoryDocument.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static InventoryDocumentRequest request(long variantId, String quantity, String serial) {
        InventoryDocumentLineRequest line = new InventoryDocumentLineRequest();
        line.setVariantId(variantId);
        line.setQuantityOut(new BigDecimal(quantity));
        line.setBaseQuantity(new BigDecimal(quantity));
        line.setSerialNumbers(List.of(serial));
        InventoryDocumentRequest req = new InventoryDocumentRequest();
        req.setWarehouseId(1L);
        req.setDocDate(LocalDate.of(2026, 9, 23));
        req.setIssuePurpose("ASSEMBLY");
        req.setReferenceType("ASSEMBLY_ORDER");
        req.setReferenceId(8L);
        req.setCreatedBy(1L);
        req.setLines(List.of(line));
        return req;
    }

    @Test
    void warehouseKeeperCanPickSerialsOnAnAssemblyExport() {
        service.updateExport(DOC_ID, request(69L, "1", "CPU-SN-001"));

        assertEquals("CPU-SN-001", doc.getLines().get(0).getSerialNumbersText());
        assertEquals(0, BigDecimal.ONE.compareTo(doc.getLines().get(0).getQuantityOut()));
    }

    @Test
    void quantityOfAnAssemblyExportCannotBeChanged() {
        assertThrows(BusinessException.class, () -> service.updateExport(DOC_ID, request(69L, "2", "CPU-SN-001")));
        verify(documentRepository, never()).save(any(InventoryDocument.class));
    }
}
