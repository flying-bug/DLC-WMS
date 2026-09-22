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
import com.duylongtech.backend.feature.inventory.InventoryDocumentMapper;
import com.duylongtech.backend.feature.inventory.InventoryDocumentReferenceRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentService;
import com.duylongtech.backend.feature.inventory.InventoryLedgerRepository;
import com.duylongtech.backend.feature.inventory.InventoryPostingService;
import com.duylongtech.backend.feature.inventory.InventoryValidationService;
import com.duylongtech.backend.feature.inventory.RepairScrapLineRequest;
import com.duylongtech.backend.feature.inventory.RepairStockOutLineRequest;
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
import com.duylongtech.backend.unitreport.UnitTestCase;
import com.duylongtech.backend.unitreport.UnitTestMethod;
import com.duylongtech.backend.unitreport.UnitTestMethod.Technique;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test report: InventoryDocumentService.createExportForRepair / createScrapImportForRepair
 * (8 tham số, trả về Long). Mỗi test tương ứng 1 testcase UTCIDxx trong
 * utool/testcases/primitive-return-methods-testcases.json.
 * <p>
 * Precondition chung (mặc định của mock): lệnh sửa chữa 12 chưa có phiếu, không serial nào bị giữ ở phiếu nháp.
 * Testcase chủ yếu đổi tham số; chỉ các nhánh bắt buộc cần dữ liệu có sẵn mới stub thêm.
 */
class InventoryDocumentServiceRepairDocumentTest {

    private static final Long SAVED_ID = 501L;

    private InventoryDocumentRepository documentRepository;
    private InventoryDocumentLineRepository lineRepository;
    private InventoryDocumentService service;

    @BeforeEach
    void setUp() {
        documentRepository = mock(InventoryDocumentRepository.class);
        lineRepository = mock(InventoryDocumentLineRepository.class);
        service = new InventoryDocumentService(
                mock(CodeGeneratorService.class),
                mock(InventoryDocumentMapper.class),
                documentRepository,
                lineRepository,
                mock(InventoryBalanceRepository.class),
                mock(InventoryCostLayerRepository.class),
                mock(InventoryValidationService.class),
                mock(InventoryPostingService.class),
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
                mock(InventoryDocumentReferenceRepository.class)
        );
        // Chưa có phiếu nào -> mã tự sinh là XK00001 / NK00001
        when(documentRepository.findAllExportDocCodes()).thenReturn(List.of());
        when(documentRepository.findAllImportDocCodes()).thenReturn(List.of());
        when(documentRepository.existsByDocCode(anyString())).thenReturn(false);
        when(documentRepository.save(any(InventoryDocument.class))).thenAnswer(inv -> {
            InventoryDocument doc = inv.getArgument(0);
            doc.setId(SAVED_ID);
            return doc;
        });
    }

    private InventoryDocument captureSaved() {
        ArgumentCaptor<InventoryDocument> captor = ArgumentCaptor.forClass(InventoryDocument.class);
        verify(documentRepository).save(captor.capture());
        return captor.getValue();
    }

    private static RepairStockOutLineRequest outLine(Long variantId, String quantity, Long serialId) {
        return new RepairStockOutLineRequest(variantId, quantity == null ? null : new BigDecimal(quantity),
                serialId, serialId == null ? null : "SN-" + serialId, "Thay RAM", 900L);
    }

    @UnitTestMethod(module = "InventoryDocumentService",
            signature = "createExportForRepair(Long repairId, String repairCode, Long warehouseId, Long partnerId, Long createdBy, Long salespersonId, String recipientName, List<RepairStockOutLineRequest> lines)",
            technique = Technique.BRANCH,
            precondition = {"Repair 12 has no REPAIR export yet; no serial is held by a draft export; no XK code exists (next code XK00001)"})
    @Nested
    @DisplayName("createExportForRepair(Long repairId, String repairCode, Long warehouseId, Long partnerId, Long createdBy, Long salespersonId, String recipientName, List<RepairStockOutLineRequest> lines)")
    class CreateExportForRepair {

        private Long call(List<RepairStockOutLineRequest> lines) {
            return service.createExportForRepair(12L, "SC00012", 1L, 5L, 7L, 8L, "Nguyen Van A", lines);
        }

        @Test
        @UnitTestCase(id = "UTCID01", type = "N",
                purpose = "Verify one valid line creates DRAFT export XK00001 for repair 12 and returns the saved id.",
                inputs = {
                        "repairId=12",
                        "repairCode=\"SC00012\"",
                        "warehouseId=1",
                        "partnerId=5",
                        "createdBy=7",
                        "salespersonId=8",
                        "recipientName=\"Nguyen Van A\"",
                        "lines=[{variantId=30, quantity=2}]"
                },
                returns = "501 - saved XK00001: issuePurpose=REPAIR, referenceId=12, warehouseId=1, partnerId=5, status=DRAFT, note='Phiếu xuất linh kiện sửa chữa - Lệnh SC00012', 1 line quantityOut=2")
        @DisplayName("UTCID01 - 1 dòng quantity=2 -> 501, phiếu DRAFT XK00001 đúng thông tin")
        void utcid01OneLineCreatesDraftExport() {
            assertEquals(SAVED_ID, call(List.of(outLine(30L, "2", null))));

            InventoryDocument saved = captureSaved();
            assertEquals("XK00001", saved.getDocCode());
            assertEquals("REPAIR", saved.getIssuePurpose());
            assertEquals("REPAIR", saved.getReferenceType());
            assertEquals(12L, saved.getReferenceId());
            assertEquals(1L, saved.getWarehouseId());
            assertEquals(5L, saved.getPartnerId());
            assertEquals(8L, saved.getSalespersonId());
            assertEquals("DRAFT", saved.getStatus());
            assertEquals("Phiếu xuất linh kiện sửa chữa - Lệnh SC00012", saved.getNote());
            assertEquals("Nguyen Van A", saved.getRecipientName());
            assertEquals(1, saved.getLines().size());
            assertEquals(new BigDecimal("2"), saved.getLines().get(0).getQuantityOut());
        }

        @Test
        @UnitTestCase(id = "UTCID02", type = "N",
                purpose = "Verify a line carrying serialNumberId=77 keeps that serial on the saved export line.",
                inputs = {
                        "repairId=12",
                        "repairCode=\"SC00012\"",
                        "warehouseId=1",
                        "partnerId=5",
                        "createdBy=7",
                        "salespersonId=8",
                        "recipientName=\"Nguyen Van A\"",
                        "lines=[{variantId=30, quantity=1, serialNumberId=77}]"
                },
                returns = "501 - saved line serialNumberId=77, serialNumbersText='SN-77'")
        @DisplayName("UTCID02 - dòng có serialNumberId=77 -> 501, dòng giữ serial 77")
        void utcid02SerialLineKeepsSerial() {
            assertEquals(SAVED_ID, call(List.of(outLine(30L, "1", 77L))));

            InventoryDocumentLine line = captureSaved().getLines().get(0);
            assertEquals(77L, line.getSerialNumberId());
            assertEquals("SN-77", line.getSerialNumbersText());
        }

        @Test
        @UnitTestCase(id = "UTCID03", type = "N",
                purpose = "Verify two valid lines are both kept on the saved export.",
                inputs = {
                        "repairId=12",
                        "repairCode=\"SC00012\"",
                        "warehouseId=1",
                        "partnerId=5",
                        "createdBy=7",
                        "salespersonId=8",
                        "recipientName=\"Nguyen Van A\"",
                        "lines=[{variantId=30, quantity=1}, {variantId=31, quantity=3}]"
                },
                returns = "501 - saved document has 2 lines: quantityOut=1 and quantityOut=3")
        @DisplayName("UTCID03 - 2 dòng quantity=1 và 3 -> 501, phiếu có 2 dòng")
        void utcid03TwoLinesAreKept() {
            assertEquals(SAVED_ID, call(List.of(outLine(30L, "1", null), outLine(31L, "3", null))));

            InventoryDocument saved = captureSaved();
            assertEquals(2, saved.getLines().size());
            assertEquals(new BigDecimal("1"), saved.getLines().get(0).getQuantityOut());
            assertEquals(new BigDecimal("3"), saved.getLines().get(1).getQuantityOut());
        }

        @Test
        @UnitTestCase(id = "UTCID04", type = "N",
                purpose = "Verify a walk-in repair (no partner, salesperson or recipient) still creates the export with those fields empty.",
                inputs = {
                        "repairId=12",
                        "repairCode=\"SC00012\"",
                        "warehouseId=1",
                        "partnerId=null",
                        "createdBy=7",
                        "salespersonId=null",
                        "recipientName=null",
                        "lines=[{variantId=30, quantity=2}]"
                },
                returns = "501 - saved document partnerId=null, salespersonId=null, recipientName=null")
        @DisplayName("UTCID04 - khách lẻ: partnerId/salespersonId/recipientName = null -> 501, phiếu để trống các trường này")
        void utcid04WalkInCustomerWithoutPartner() {
            Long id = service.createExportForRepair(12L, "SC00012", 1L, null, 7L, null, null,
                    List.of(outLine(30L, "2", null)));

            assertEquals(SAVED_ID, id);
            InventoryDocument saved = captureSaved();
            assertNull(saved.getPartnerId());
            assertNull(saved.getSalespersonId());
            assertNull(saved.getRecipientName());
        }

        @Test
        @UnitTestCase(id = "UTCID05", type = "B",
                purpose = "Verify lines with quantity=0 and quantity=null are skipped, so nothing is saved and null is returned.",
                inputs = {
                        "repairId=12",
                        "repairCode=\"SC00012\"",
                        "warehouseId=1",
                        "partnerId=5",
                        "createdBy=7",
                        "salespersonId=8",
                        "recipientName=\"Nguyen Van A\"",
                        "lines=[{variantId=30, quantity=0}, {variantId=31, quantity=null}]"
                },
                returns = "null - no document is saved")
        @DisplayName("UTCID05 - mọi dòng quantity=0/null -> null, không lưu")
        void utcid05ZeroAndNullQuantityReturnsNull() {
            assertNull(call(Arrays.asList(outLine(30L, "0", null), outLine(31L, null, null))));
            verify(documentRepository, never()).save(any());
        }

        @Test
        @UnitTestCase(id = "UTCID06", type = "B",
                purpose = "Verify a negative-quantity line is skipped while the positive line is kept.",
                inputs = {
                        "repairId=12",
                        "repairCode=\"SC00012\"",
                        "warehouseId=1",
                        "partnerId=5",
                        "createdBy=7",
                        "salespersonId=8",
                        "recipientName=\"Nguyen Van A\"",
                        "lines=[{variantId=30, quantity=-1}, {variantId=31, quantity=1}]"
                },
                returns = "501 - saved document has 1 line (variantId=31)")
        @DisplayName("UTCID06 - dòng quantity=-1 bị bỏ, dòng quantity=1 được giữ -> 501")
        void utcid06NegativeLineSkippedPositiveKept() {
            assertEquals(SAVED_ID, call(List.of(outLine(30L, "-1", null), outLine(31L, "1", null))));

            InventoryDocument saved = captureSaved();
            assertEquals(1, saved.getLines().size());
            assertEquals(31L, saved.getLines().get(0).getVariantId());
        }

        @Test
        @UnitTestCase(id = "UTCID07", type = "B",
                purpose = "Verify an empty lines list produces no document and returns null.",
                inputs = {
                        "repairId=12",
                        "repairCode=\"SC00012\"",
                        "warehouseId=1",
                        "partnerId=5",
                        "createdBy=7",
                        "salespersonId=8",
                        "recipientName=\"Nguyen Van A\"",
                        "lines=[] (empty list)"
                },
                returns = "null - no document is saved")
        @DisplayName("UTCID07 - lines rỗng -> null, không lưu")
        void utcid07EmptyLinesReturnsNull() {
            assertNull(call(List.of()));
            verify(documentRepository, never()).save(any());
        }

        @Test
        @UnitTestCase(id = "UTCID08", type = "A",
                purpose = "Verify the export is idempotent: when repair 12 already has a REPAIR export, null is returned and nothing is saved.",
                inputs = {
                        "repairId=12",
                        "repairCode=\"SC00012\"",
                        "warehouseId=1",
                        "partnerId=5",
                        "createdBy=7",
                        "salespersonId=8",
                        "recipientName=\"Nguyen Van A\"",
                        "lines=[{variantId=30, quantity=2}]"
                },
                precondition = {"Repair 12 already has a REPAIR export (doc type EX_SO)"},
                returns = "null - no document is saved")
        @DisplayName("UTCID08 - lệnh 12 đã có phiếu xuất REPAIR -> null, không lưu")
        void utcid08ExistingExportReturnsNull() {
            when(documentRepository.existsByReferenceTypeAndReferenceIdAndDocType("REPAIR", 12L, "EX_SO")).thenReturn(true);

            assertNull(call(List.of(outLine(30L, "2", null))));
            verify(documentRepository, never()).save(any());
        }

        @Test
        @UnitTestCase(id = "UTCID09", type = "A",
                purpose = "Verify a serial already held by another draft export stops the creation with a BusinessException.",
                inputs = {
                        "repairId=12",
                        "repairCode=\"SC00012\"",
                        "warehouseId=1",
                        "partnerId=5",
                        "createdBy=7",
                        "salespersonId=8",
                        "recipientName=\"Nguyen Van A\"",
                        "lines=[{variantId=30, quantity=1, serialNumberId=77}]"
                },
                precondition = {"Repair 12 has no REPAIR export yet; serial 77 is held by another draft export"},
                exception = "BusinessException: Serial đã được giữ cho một phiếu xuất kho khác")
        @DisplayName("UTCID09 - serial 77 đang bị giữ ở phiếu nháp khác -> BusinessException")
        void utcid09LockedSerialThrows() {
            when(lineRepository.isSerialLockedInDrafts(77L, null)).thenReturn(true);

            BusinessException ex = assertThrows(BusinessException.class, () -> call(List.of(outLine(30L, "1", 77L))));
            assertEquals("Serial đã được giữ cho một phiếu xuất kho khác", ex.getMessage());
            verify(documentRepository, never()).save(any());
        }
    }

    private static RepairScrapLineRequest scrapLine(Long variantId, String quantity, Long serialId) {
        return new RepairScrapLineRequest(variantId, new BigDecimal(quantity), serialId,
                serialId == null ? null : "SN-" + serialId, 901L);
    }

    @UnitTestMethod(module = "InventoryDocumentService",
            signature = "createScrapImportForRepair(Long repairId, String repairCode, Long scrapWarehouseId, Long partnerId, Long createdBy, Long salespersonId, String recipientName, List<RepairScrapLineRequest> lines)",
            technique = Technique.BRANCH,
            precondition = {"Repair 12 has no scrap import yet; no NK code exists (next code NK00001)"})
    @Nested
    @DisplayName("createScrapImportForRepair(Long repairId, String repairCode, Long scrapWarehouseId, Long partnerId, Long createdBy, Long salespersonId, String recipientName, List<RepairScrapLineRequest> lines)")
    class CreateScrapImportForRepair {

        private Long call(List<RepairScrapLineRequest> lines) {
            return service.createScrapImportForRepair(12L, "SC00012", 9L, 5L, 7L, 8L, "Nguyen Van A", lines);
        }

        @Test
        @UnitTestCase(id = "UTCID01", type = "N",
                purpose = "Verify one removed component creates DRAFT SCRAP import NK00001 into scrap warehouse 9 and returns its id.",
                inputs = {
                        "repairId=12",
                        "repairCode=\"SC00012\"",
                        "scrapWarehouseId=9",
                        "partnerId=5",
                        "createdBy=7",
                        "salespersonId=8",
                        "recipientName=\"Nguyen Van A\"",
                        "lines=[{variantId=31, quantity=1, serialNumberId=88}]"
                },
                returns = "501 - saved NK00001: issuePurpose=SCRAP, warehouseId=9, status=DRAFT, line quantityIn=1, serialNumberId=88, note='Linh kiện tháo ra từ lệnh sửa SC00012'")
        @DisplayName("UTCID01 - 1 dòng serial 88 -> 501, phiếu SCRAP NK00001 vào kho phế liệu 9")
        void utcid01OneLineCreatesScrapImport() {
            assertEquals(SAVED_ID, call(List.of(scrapLine(31L, "1", 88L))));

            InventoryDocument saved = captureSaved();
            assertEquals("NK00001", saved.getDocCode());
            assertEquals("SCRAP", saved.getIssuePurpose());
            assertEquals(9L, saved.getWarehouseId());
            assertEquals("DRAFT", saved.getStatus());
            assertEquals("Phiếu nhập kho phế liệu - Lệnh sửa chữa SC00012", saved.getNote());
            InventoryDocumentLine line = saved.getLines().get(0);
            assertEquals(new BigDecimal("1"), line.getQuantityIn());
            assertEquals(88L, line.getSerialNumberId());
            assertEquals("Linh kiện tháo ra từ lệnh sửa SC00012", line.getNote());
        }

        @Test
        @UnitTestCase(id = "UTCID02", type = "N",
                purpose = "Verify a walk-in repair (no partner, salesperson or recipient) still creates the scrap import with those fields empty.",
                inputs = {
                        "repairId=12",
                        "repairCode=\"SC00012\"",
                        "scrapWarehouseId=9",
                        "partnerId=null",
                        "createdBy=7",
                        "salespersonId=null",
                        "recipientName=null",
                        "lines=[{variantId=31, quantity=1}]"
                },
                returns = "501 - saved document partnerId=null, salespersonId=null, recipientName=null")
        @DisplayName("UTCID02 - khách lẻ: partnerId/salespersonId/recipientName = null -> 501")
        void utcid02WalkInCustomerWithoutPartner() {
            Long id = service.createScrapImportForRepair(12L, "SC00012", 9L, null, 7L, null, null,
                    List.of(scrapLine(31L, "1", null)));

            assertEquals(SAVED_ID, id);
            InventoryDocument saved = captureSaved();
            assertNull(saved.getPartnerId());
            assertNull(saved.getSalespersonId());
            assertNull(saved.getRecipientName());
        }

        @Test
        @UnitTestCase(id = "UTCID03", type = "B",
                purpose = "Verify scrap lines are not filtered by quantity: a quantity=0 line is kept next to a quantity=3 line.",
                inputs = {
                        "repairId=12",
                        "repairCode=\"SC00012\"",
                        "scrapWarehouseId=9",
                        "partnerId=5",
                        "createdBy=7",
                        "salespersonId=8",
                        "recipientName=\"Nguyen Van A\"",
                        "lines=[{variantId=31, quantity=0}, {variantId=32, quantity=3}]"
                },
                returns = "501 - saved document keeps 2 lines: quantityIn=0 and quantityIn=3")
        @DisplayName("UTCID03 - 2 dòng quantity=0 và 3 -> 501, giữ cả 2 dòng")
        void utcid03AllLinesKeptEvenZeroQuantity() {
            assertEquals(SAVED_ID, call(List.of(scrapLine(31L, "0", null), scrapLine(32L, "3", null))));

            InventoryDocument saved = captureSaved();
            assertEquals(2, saved.getLines().size());
            assertEquals(new BigDecimal("0"), saved.getLines().get(0).getQuantityIn());
            assertEquals(new BigDecimal("3"), saved.getLines().get(1).getQuantityIn());
        }

        @Test
        @UnitTestCase(id = "UTCID04", type = "B",
                purpose = "Verify an empty lines list produces no scrap import and returns null.",
                inputs = {
                        "repairId=12",
                        "repairCode=\"SC00012\"",
                        "scrapWarehouseId=9",
                        "partnerId=5",
                        "createdBy=7",
                        "salespersonId=8",
                        "recipientName=\"Nguyen Van A\"",
                        "lines=[] (empty list)"
                },
                returns = "null - no document is saved")
        @DisplayName("UTCID04 - lines rỗng -> null, không lưu")
        void utcid04EmptyLinesReturnsNull() {
            assertNull(call(List.of()));
            verify(documentRepository, never()).save(any());
        }

        @Test
        @UnitTestCase(id = "UTCID05", type = "A",
                purpose = "Verify an existing scrap import for repair 12 makes the call return null without saving a second document.",
                inputs = {
                        "repairId=12",
                        "repairCode=\"SC00012\"",
                        "scrapWarehouseId=9",
                        "partnerId=5",
                        "createdBy=7",
                        "salespersonId=8",
                        "recipientName=\"Nguyen Van A\"",
                        "lines=[{variantId=31, quantity=1, serialNumberId=88}]"
                },
                precondition = {"Repair 12 already has a scrap import (doc type IN_PO)"},
                returns = "null - no document is saved")
        @DisplayName("UTCID05 - lệnh 12 đã có phiếu nhập phế liệu -> null, không lưu")
        void utcid05ExistingImportReturnsNull() {
            when(documentRepository.existsByReferenceTypeAndReferenceIdAndDocType("REPAIR", 12L, "IN_PO")).thenReturn(true);

            assertNull(call(List.of(scrapLine(31L, "1", 88L))));
            verify(documentRepository, never()).save(any());
        }
    }
}
