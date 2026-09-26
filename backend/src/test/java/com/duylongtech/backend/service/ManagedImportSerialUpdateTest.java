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
 * Phiếu nhập tự sinh của lệnh lắp ráp được tạo không kèm serial, nên thủ kho phải nhập serial thành phẩm trước khi ghi
 * sổ. Trước đây updateImport chặn mọi thay đổi ("Phiếu kho tự động của lệnh kỹ thuật không được sửa trực tiếp") nên
 * phiếu không ghi sổ được. Giờ được nhập serial, nhưng vẫn không được đổi mã hàng / số lượng / kho / đơn giá (giá vốn
 * thành phẩm đã tính theo phiếu xuất linh kiện của cùng lệnh).
 */
class ManagedImportSerialUpdateTest {

    private static final long DOC_ID = 45L;

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
        doc.initImportDocument("NK00045");
        doc.updateStatus("DRAFT");
        doc.setId(DOC_ID);
        doc.setIssuePurpose("PRODUCTION");
        doc.setReferenceType("ASSEMBLY_ORDER");
        doc.setReferenceId(8L);
        doc.setWarehouseId(1L);
        InventoryDocumentLine line = new InventoryDocumentLine();
        line.setVariantId(90L);
        line.setWarehouseId(1L);
        line.setQuantityIn(new BigDecimal("2"));
        line.setBaseQuantity(new BigDecimal("2"));
        line.setUnitCost(new BigDecimal("15000000"));
        doc.addImportLine(line);
        when(documentRepository.findImportByIdWithLines(DOC_ID)).thenReturn(Optional.of(doc));
        when(documentRepository.save(any(InventoryDocument.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static InventoryDocumentRequest request(long variantId, long warehouseId, String quantity, String unitCost,
                                                    List<String> serials) {
        InventoryDocumentLineRequest line = new InventoryDocumentLineRequest();
        line.setVariantId(variantId);
        line.setWarehouseId(warehouseId);
        line.setQuantityIn(new BigDecimal(quantity));
        line.setBaseQuantity(new BigDecimal(quantity));
        line.setUnitCost(new BigDecimal(unitCost));
        line.setSerialNumbers(serials);
        InventoryDocumentRequest req = new InventoryDocumentRequest();
        req.setWarehouseId(1L);
        req.setDocDate(LocalDate.of(2026, 9, 24));
        req.setIssuePurpose("PRODUCTION");
        req.setReferenceType("ASSEMBLY_ORDER");
        req.setReferenceId(8L);
        req.setCreatedBy(1L);
        req.setNote("Đã kiểm máy");
        req.setLines(List.of(line));
        return req;
    }

    @Test
    void warehouseKeeperCanEnterSerialsOfTheAssembledProducts() {
        service.updateImport(DOC_ID, request(90L, 1L, "2", "15000000", List.of("PC-SN-001", "PC-SN-002")));

        InventoryDocumentLine saved = doc.getLines().get(0);
        assertEquals("PC-SN-001\nPC-SN-002", saved.getSerialNumbersText());
        assertEquals(0, new BigDecimal("2").compareTo(saved.getQuantityIn()));
        assertEquals("Đã kiểm máy", doc.getNote());
        verify(documentRepository).save(doc);
    }

    @Test
    void unitCostSentByTheScreenDoesNotOverrideTheCostFromTheOrder() {
        service.updateImport(DOC_ID, request(90L, 1L, "2", "0", List.of("PC-SN-001", "PC-SN-002")));

        assertEquals(0, new BigDecimal("15000000").compareTo(doc.getLines().get(0).getUnitCost()));
    }

    @Test
    void quantityProductOrWarehouseOfAnAssemblyImportCannotBeChanged() {
        assertThrows(BusinessException.class, () -> service.updateImport(DOC_ID, request(90L, 1L, "1", "15000000", List.of("PC-SN-001"))));
        assertThrows(BusinessException.class, () -> service.updateImport(DOC_ID, request(91L, 1L, "2", "15000000", List.of("A", "B"))));
        assertThrows(BusinessException.class, () -> service.updateImport(DOC_ID, request(90L, 2L, "2", "15000000", List.of("A", "B"))));
        verify(documentRepository, never()).save(any(InventoryDocument.class));
    }

    @Test
    void aPostedAssemblyImportCannotBeEdited() {
        doc.updateStatus("POSTED");

        assertThrows(BusinessException.class, () -> service.updateImport(DOC_ID, request(90L, 1L, "2", "15000000", List.of("A", "B"))));
        verify(documentRepository, never()).save(any(InventoryDocument.class));
    }
}
