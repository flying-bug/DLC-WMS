package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.InventoryDocumentLineRequest;
import com.duylongtech.backend.dto.request.InventoryDocumentRequest;
import com.duylongtech.backend.dto.response.InventoryDocumentResponse;
import com.duylongtech.backend.entity.InventoryBalance;
import com.duylongtech.backend.entity.InventoryCostLayer;
import com.duylongtech.backend.entity.InventoryDocument;
import com.duylongtech.backend.entity.InventoryDocumentLine;
import com.duylongtech.backend.entity.InventoryLedger;
import com.duylongtech.backend.entity.Product;
import com.duylongtech.backend.entity.ProductVariant;
import com.duylongtech.backend.entity.SerialNumber;
import com.duylongtech.backend.entity.Warranty;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.AssemblyBomRepository;
import com.duylongtech.backend.repository.AssemblyOrderRepository;
import com.duylongtech.backend.repository.DeviceComponentSerialRepository;
import com.duylongtech.backend.repository.InventoryBalanceRepository;
import com.duylongtech.backend.repository.InventoryCostLayerRepository;
import com.duylongtech.backend.repository.InventoryDocumentLineRepository;
import com.duylongtech.backend.repository.InventoryDocumentRepository;
import com.duylongtech.backend.repository.InventoryLedgerRepository;
import com.duylongtech.backend.repository.PartnerRepository;
import com.duylongtech.backend.repository.ProductRepository;
import com.duylongtech.backend.repository.ProductVariantRepository;
import com.duylongtech.backend.repository.PurchaseOrderRepository;
import com.duylongtech.backend.repository.RepairRepository;
import com.duylongtech.backend.repository.SalesOrderRepository;
import com.duylongtech.backend.repository.SerialNumberRepository;
import com.duylongtech.backend.repository.StocktakeRepository;
import com.duylongtech.backend.repository.UserRepository;
import com.duylongtech.backend.repository.WarrantyRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InventoryDocumentServiceFlowTest {

    private static final Long DOCUMENT_ID = 50L;
    private static final Long WAREHOUSE_ID = 1L;
    private static final Long VARIANT_ID = 100L;
    private static final Long USER_ID = 7L;

    @Mock private CodeGeneratorService codeGeneratorService;
    @Mock private InventoryDocumentRepository inventoryDocumentRepository;
    @Mock private InventoryDocumentLineRepository inventoryDocumentLineRepository;
    @Mock private InventoryBalanceRepository inventoryBalanceRepository;
    @Mock private InventoryCostLayerRepository inventoryCostLayerRepository;
    @Mock private InventoryLedgerRepository inventoryLedgerRepository;
    @Mock private SerialNumberRepository serialNumberRepository;
    @Mock private PartnerLedgerService partnerLedgerService;
    @Mock private ProductVariantRepository productVariantRepository;
    @Mock private WarrantyRepository warrantyRepository;
    @Mock private WarrantyLifecycleService warrantyLifecycleService;
    @Mock private PartnerRepository partnerRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProductRepository productRepository;
    @Mock private AssemblyOrderRepository assemblyOrderRepository;
    @Mock private AssemblyBomRepository assemblyBomRepository;
    @Mock private StocktakeRepository stocktakeRepository;
    @Mock private SalesOrderRepository salesOrderRepository;
    @Mock private RepairRepository repairRepository;
    @Mock private PurchaseOrderRepository purchaseOrderRepository;
    @Mock private SalesOrderService salesOrderService;
    @Mock private DeviceComponentSerialRepository deviceComponentSerialRepository;

    @InjectMocks
    private InventoryDocumentService service;

    @Test
    void createImport_validRequest_mapsImportLineAndReturnsDraft() {
        InventoryDocumentRequest request = importRequest("NK90001", decimal("5"), decimal("120"));
        request.getLines().get(0).setVatPercent(decimal("10"));
        stubDocumentSave();

        InventoryDocumentResponse result = service.createImport(request);

        ArgumentCaptor<InventoryDocument> captor = ArgumentCaptor.forClass(InventoryDocument.class);
        verify(inventoryDocumentRepository).save(captor.capture());
        InventoryDocument saved = captor.getValue();
        InventoryDocumentLine line = saved.getLines().get(0);
        assertAll(
                () -> assertEquals("IN_PO", saved.getDocType()),
                () -> assertEquals("DRAFT", result.getStatus()),
                () -> assertDecimal("5", line.getQuantityIn()),
                () -> assertDecimal("0", line.getQuantityOut()),
                () -> assertDecimal("120", line.getUnitCost()),
                () -> assertDecimal("660", line.getLineAmount()));
    }

    @Test
    void createExport_validRequest_mapsExportLineAndNormalizesPurpose() {
        InventoryDocumentRequest request = exportRequest("XK90001", decimal("3"));
        request.setIssuePurpose(" usage ");
        request.getLines().get(0).setUnitPrice(decimal("200"));
        request.getLines().get(0).setVatRate(decimal("5"));
        stubDocumentSave();

        InventoryDocumentResponse result = service.createExport(request);

        ArgumentCaptor<InventoryDocument> captor = ArgumentCaptor.forClass(InventoryDocument.class);
        verify(inventoryDocumentRepository).save(captor.capture());
        InventoryDocument saved = captor.getValue();
        InventoryDocumentLine line = saved.getLines().get(0);
        assertAll(
                () -> assertEquals("EX_SO", saved.getDocType()),
                () -> assertEquals("USAGE", result.getIssuePurpose()),
                () -> assertDecimal("0", line.getQuantityIn()),
                () -> assertDecimal("3", line.getQuantityOut()),
                () -> assertDecimal("630", line.getLineAmount()));
    }

    @Test
    void createExport_quantityInPresent_rejectsRequestWithoutSaving() {
        InventoryDocumentRequest request = exportRequest("XK90002", decimal("1"));
        request.getLines().get(0).setQuantityIn(BigDecimal.ONE);

        assertThrows(BusinessException.class, () -> service.createExport(request));

        verify(inventoryDocumentRepository, never()).save(any());
    }

    @Test
    void createImport_nullRequest_rejectsWithoutSaving() {
        assertThrows(BusinessException.class, () -> service.createImport(null));

        verify(inventoryDocumentRepository, never()).save(any());
    }

    @Test
    void createImport_zeroQuantity_rejectsBoundaryWithoutSaving() {
        InventoryDocumentRequest request = importRequest("NK90002", BigDecimal.ZERO, decimal("100"));

        assertThrows(BusinessException.class, () -> service.createImport(request));

        verify(inventoryDocumentRepository, never()).save(any());
    }

    @Test
    void createImport_quantityOutPresent_rejectsRequestWithoutSaving() {
        InventoryDocumentRequest request = importRequest("NK90003", BigDecimal.ONE, decimal("100"));
        request.getLines().get(0).setQuantityOut(BigDecimal.ONE);

        assertThrows(BusinessException.class, () -> service.createImport(request));

        verify(inventoryDocumentRepository, never()).save(any());
    }

    @Test
    void createExport_zeroQuantity_rejectsBoundaryWithoutSaving() {
        InventoryDocumentRequest request = exportRequest("XK90003", BigDecimal.ZERO);

        assertThrows(BusinessException.class, () -> service.createExport(request));

        verify(inventoryDocumentRepository, never()).save(any());
    }

    @Test
    void createExport_invalidPurpose_rejectsRequestWithoutSaving() {
        InventoryDocumentRequest request = exportRequest("XK90004", BigDecimal.ONE);
        request.setIssuePurpose("UNKNOWN_PURPOSE");

        assertThrows(BusinessException.class, () -> service.createExport(request));

        verify(inventoryDocumentRepository, never()).save(any());
    }

    @Test
    void postImport_postedDocument_rejectsWithoutChangingStock() {
        InventoryDocument document = importDocument("POSTED", decimal("2"), decimal("100"));
        when(inventoryDocumentRepository.findImportByIdWithLines(DOCUMENT_ID)).thenReturn(Optional.of(document));

        assertThrows(BusinessException.class, () -> service.postImport(DOCUMENT_ID));

        verify(inventoryBalanceRepository, never()).save(any());
        verify(inventoryLedgerRepository, never()).save(any());
    }

    @Test
    void postImport_newSku_createsBalanceCostLayerAndInboundLedger() {
        InventoryDocument document = importDocument("DRAFT", decimal("5"), decimal("120"));
        stubImportDocument(document);
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.empty());
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID))
                .thenReturn(List.of());

        InventoryDocumentResponse result = service.postImport(DOCUMENT_ID);

        ArgumentCaptor<InventoryBalance> balanceCaptor = ArgumentCaptor.forClass(InventoryBalance.class);
        ArgumentCaptor<InventoryCostLayer> layerCaptor = ArgumentCaptor.forClass(InventoryCostLayer.class);
        ArgumentCaptor<InventoryLedger> ledgerCaptor = ArgumentCaptor.forClass(InventoryLedger.class);
        verify(inventoryBalanceRepository).save(balanceCaptor.capture());
        verify(inventoryCostLayerRepository).save(layerCaptor.capture());
        verify(inventoryLedgerRepository).save(ledgerCaptor.capture());
        assertAll(
                () -> assertEquals("POSTED", result.getStatus()),
                () -> assertNotNull(result.getPostedAt()),
                () -> assertDecimal("5", balanceCaptor.getValue().getQuantityOnHand()),
                () -> assertDecimal("120", balanceCaptor.getValue().getAverageCost()),
                () -> assertDecimal("5", layerCaptor.getValue().getQuantityLayered()),
                () -> assertEquals("IN", ledgerCaptor.getValue().getMovementType()),
                () -> assertDecimal("5", ledgerCaptor.getValue().getQuantityIn()),
                () -> assertDecimal("5", ledgerCaptor.getValue().getBalanceAfter()));
    }

    @Test
    void postImport_existingSku_recalculatesWeightedAverageCost() {
        InventoryDocument document = importDocument("SUBMITTED", decimal("5"), decimal("160"));
        InventoryBalance balance = balance(decimal("10"), decimal("100"));
        stubImportDocument(document);
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.of(balance));

        service.postImport(DOCUMENT_ID);

        assertAll(
                () -> assertDecimal("15", balance.getQuantityOnHand()),
                () -> assertDecimal("120", balance.getAverageCost()));
        verify(inventoryBalanceRepository).save(balance);
    }

    @Test
    void postImport_partnerWithoutPurchaseOrder_recordsSupplierDebt() {
        InventoryDocument document = importDocument("DRAFT", decimal("3"), decimal("100"));
        document.setPartnerId(20L);
        stubImportDocument(document);
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.of(balance(decimal("0"), decimal("0"))));

        service.postImport(DOCUMENT_ID);

        verify(partnerLedgerService).recordLedger(
                eq(20L), eq("INVENTORY_IMPORT"), eq(DOCUMENT_ID), eq("NK00050"),
                eq(decimal("300")), eq(BigDecimal.ZERO), any());
    }

    @Test
    void postImport_partnerWithVat_recordsSupplierDebtWithVat() {
        InventoryDocument document = importDocument("DRAFT", decimal("10"), decimal("100"));
        document.setPartnerId(20L);
        // Line subtotal = 1000, vat 10% = 100 => lineAmount = 1100
        document.getLines().get(0).setVatRate(decimal("10"));
        document.getLines().get(0).setLineAmount(decimal("1100"));
        stubImportDocument(document);
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.of(balance(decimal("0"), decimal("0"))));

        service.postImport(DOCUMENT_ID);

        verify(partnerLedgerService).recordLedger(
                eq(20L), eq("INVENTORY_IMPORT"), eq(DOCUMENT_ID), eq("NK00050"),
                eq(decimal("1100")), eq(BigDecimal.ZERO), any());
    }

    @Test
    void postImport_serialTrackedProduct_createsSerialsAndPerSerialBalances() {
        InventoryDocument document = importDocument("DRAFT", decimal("2"), decimal("90"));
        document.getLines().get(0).setSerialNumbersText("SN-001\nSN-002");
        Product product = Product.builder().trackSerial(true).build();
        ProductVariant variant = ProductVariant.builder().id(VARIANT_ID).product(product).build();
        stubImportDocument(document);
        when(productVariantRepository.findById(VARIANT_ID)).thenReturn(Optional.of(variant));
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.of(balance(decimal("0"), decimal("0"))));
        AtomicLong serialId = new AtomicLong(900L);
        when(serialNumberRepository.save(any())).thenAnswer(invocation -> {
            SerialNumber serial = invocation.getArgument(0);
            if (serial.getId() == null) serial.setId(serialId.getAndIncrement());
            return serial;
        });

        service.postImport(DOCUMENT_ID);

        ArgumentCaptor<SerialNumber> serialCaptor = ArgumentCaptor.forClass(SerialNumber.class);
        ArgumentCaptor<InventoryBalance> balanceCaptor = ArgumentCaptor.forClass(InventoryBalance.class);
        verify(serialNumberRepository, times(2)).save(serialCaptor.capture());
        verify(inventoryBalanceRepository, times(3)).save(balanceCaptor.capture());
        List<InventoryBalance> savedBalances = balanceCaptor.getAllValues();
        assertAll(
                () -> assertEquals(List.of("SN-001", "SN-002"),
                        serialCaptor.getAllValues().stream().map(SerialNumber::getSerialNumber).toList()),
                () -> assertEquals(List.of("AVAILABLE", "AVAILABLE"),
                        serialCaptor.getAllValues().stream().map(SerialNumber::getStatus).toList()),
                () -> assertEquals(2, savedBalances.stream().filter(b -> b.getSerialNumberId() != null).count()),
                () -> savedBalances.stream().filter(b -> b.getSerialNumberId() != null)
                        .forEach(b -> assertDecimal("1", b.getQuantityOnHand())));
    }

    @Test
    void postImport_serialCountMismatch_rejectsPosting() {
        InventoryDocument document = importDocument("DRAFT", decimal("2"), decimal("90"));
        document.getLines().get(0).setSerialNumbersText("ONLY-ONE");
        Product product = Product.builder().trackSerial(true).build();
        ProductVariant variant = ProductVariant.builder().id(VARIANT_ID).product(product).build();
        when(inventoryDocumentRepository.findImportByIdWithLines(DOCUMENT_ID)).thenReturn(Optional.of(document));
        when(inventoryDocumentRepository.saveAndFlush(document)).thenReturn(document);
        when(productVariantRepository.findById(VARIANT_ID)).thenReturn(Optional.of(variant));
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.of(balance(decimal("0"), decimal("0"))));

        assertThrows(BusinessException.class, () -> service.postImport(DOCUMENT_ID));

        verify(serialNumberRepository, never()).save(any());
        assertEquals("DRAFT", document.getStatus());
    }

    @Test
    void postImport_nullId_rejectsBeforeRepositoryLookup() {
        assertThrows(BusinessException.class, () -> service.postImport(null));

        verify(inventoryDocumentRepository, never()).findImportByIdWithLines(any());
    }

    @Test
    void postImport_missingDocument_rejectsWithoutChangingStock() {
        when(inventoryDocumentRepository.findImportByIdWithLines(999L)).thenReturn(Optional.empty());

        assertThrows(BusinessException.class, () -> service.postImport(999L));

        verify(inventoryBalanceRepository, never()).save(any());
        verify(inventoryLedgerRepository, never()).save(any());
    }

    @Test
    void postImport_goodBalanceMissing_usesPositiveFallbackBalance() {
        InventoryDocument document = importDocument("DRAFT", decimal("2"), decimal("100"));
        InventoryBalance emptyBalance = balance(BigDecimal.ZERO, decimal("10"));
        InventoryBalance positiveBalance = balance(decimal("4"), decimal("50"));
        stubImportDocument(document);
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.empty());
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID))
                .thenReturn(List.of(emptyBalance, positiveBalance));

        service.postImport(DOCUMENT_ID);

        assertAll(
                () -> assertDecimal("6", positiveBalance.getQuantityOnHand()),
                () -> assertDecimal("66.6667", positiveBalance.getAverageCost()));
        verify(inventoryBalanceRepository).save(positiveBalance);
    }

    @Test
    void postImport_purchaseOrderReference_recordsSupplierDebt() {
        InventoryDocument document = importDocument("DRAFT", decimal("2"), decimal("100"));
        document.setPartnerId(20L);
        document.setReferenceType("PO");
        stubImportDocument(document);
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.of(balance(BigDecimal.ZERO, BigDecimal.ZERO)));

        service.postImport(DOCUMENT_ID);

        verify(partnerLedgerService).recordLedger(
                eq(20L), eq("INVENTORY_IMPORT"), eq(DOCUMENT_ID), eq("NK00050"),
                eq(decimal("200")), eq(BigDecimal.ZERO), any());
    }

    @Test
    void postImport_transferSerialInTransit_reactivatesItAtDestinationWarehouse() {
        InventoryDocument document = importDocument("DRAFT", BigDecimal.ONE, decimal("90"));
        document.setIssuePurpose(InventoryDocumentService.ISSUE_PURPOSE_TRANSFER_IN);
        document.getLines().get(0).setSerialNumbersText("SN-TRANSFER");
        ProductVariant variant = serialTrackedVariant();
        SerialNumber serial = SerialNumber.builder()
                .id(901L).variantId(VARIANT_ID).warehouseId(2L)
                .serialNumber("SN-TRANSFER").status("IN_TRANSIT").build();
        stubImportDocument(document);
        when(productVariantRepository.findById(VARIANT_ID)).thenReturn(Optional.of(variant));
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.of(balance(BigDecimal.ZERO, BigDecimal.ZERO)));
        when(serialNumberRepository.findByVariantIdAndSerialNumber(VARIANT_ID, "SN-TRANSFER"))
                .thenReturn(Optional.of(serial));
        when(serialNumberRepository.save(serial)).thenReturn(serial);

        service.postImport(DOCUMENT_ID);

        assertAll(
                () -> assertEquals("AVAILABLE", serial.getStatus()),
                () -> assertEquals(WAREHOUSE_ID, serial.getWarehouseId()),
                () -> assertNotNull(serial.getUpdatedAt()));
        verify(serialNumberRepository).save(serial);
    }

    @Test
    void postImport_transferSerialNotInTransit_rejectsPosting() {
        InventoryDocument document = importDocument("DRAFT", BigDecimal.ONE, decimal("90"));
        document.setIssuePurpose(InventoryDocumentService.ISSUE_PURPOSE_TRANSFER_IN);
        document.getLines().get(0).setSerialNumbersText("SN-AVAILABLE");
        SerialNumber serial = SerialNumber.builder()
                .id(902L).variantId(VARIANT_ID).warehouseId(2L)
                .serialNumber("SN-AVAILABLE").status("AVAILABLE").build();
        stubImportDocumentUntilSerialValidation(document);
        when(productVariantRepository.findById(VARIANT_ID)).thenReturn(Optional.of(serialTrackedVariant()));
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.of(balance(BigDecimal.ZERO, BigDecimal.ZERO)));
        when(serialNumberRepository.findByVariantIdAndSerialNumber(VARIANT_ID, "SN-AVAILABLE"))
                .thenReturn(Optional.of(serial));

        assertThrows(BusinessException.class, () -> service.postImport(DOCUMENT_ID));

        verify(serialNumberRepository, never()).save(serial);
    }

    @Test
    void postImport_existingSerialOutsideTransfer_rejectsDuplicate() {
        InventoryDocument document = importDocument("DRAFT", BigDecimal.ONE, decimal("90"));
        document.getLines().get(0).setSerialNumbersText("SN-DUPLICATE");
        SerialNumber serial = SerialNumber.builder()
                .id(903L).variantId(VARIANT_ID).warehouseId(WAREHOUSE_ID)
                .serialNumber("SN-DUPLICATE").status("AVAILABLE").build();
        stubImportDocumentUntilSerialValidation(document);
        when(productVariantRepository.findById(VARIANT_ID)).thenReturn(Optional.of(serialTrackedVariant()));
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.of(balance(BigDecimal.ZERO, BigDecimal.ZERO)));
        when(serialNumberRepository.findByVariantIdAndSerialNumber(VARIANT_ID, "SN-DUPLICATE"))
                .thenReturn(Optional.of(serial));

        assertThrows(BusinessException.class, () -> service.postImport(DOCUMENT_ID));

        verify(serialNumberRepository, never()).save(any());
    }

    @Test
    void postImport_fractionalSerialQuantity_rejectsWholeNumberBoundary() {
        InventoryDocument document = importDocument("DRAFT", decimal("1.5"), decimal("90"));
        document.getLines().get(0).setSerialNumbersText("SN-ONE");
        stubImportDocumentUntilSerialValidation(document);
        when(productVariantRepository.findById(VARIANT_ID)).thenReturn(Optional.of(serialTrackedVariant()));
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.of(balance(BigDecimal.ZERO, BigDecimal.ZERO)));

        assertThrows(BusinessException.class, () -> service.postImport(DOCUMENT_ID));

        verify(serialNumberRepository, never()).save(any());
    }

    @Test
    void postExport_postedDocument_rejectsWithoutChangingStock() {
        InventoryDocument document = exportDocument("POSTED", decimal("2"));
        when(inventoryDocumentRepository.findExportByIdWithLines(DOCUMENT_ID)).thenReturn(Optional.of(document));

        assertThrows(BusinessException.class, () -> service.postExport(DOCUMENT_ID));

        verify(inventoryBalanceRepository, never()).save(any());
        verify(inventoryLedgerRepository, never()).save(any());
    }

    @Test
    void postExport_missingBalance_rejectsWithoutLedger() {
        InventoryDocument document = exportDocument("DRAFT", decimal("2"));
        ProductVariant variant = ProductVariant.builder()
                .id(VARIANT_ID)
                .product(Product.builder().productName("DLC Drill").build())
                .build();
        when(inventoryDocumentRepository.findExportByIdWithLines(DOCUMENT_ID)).thenReturn(Optional.of(document));
        when(productVariantRepository.findById(VARIANT_ID)).thenReturn(Optional.of(variant));
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.empty());
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID))
                .thenReturn(List.of());

        BusinessException exception = assertThrows(BusinessException.class, () -> service.postExport(DOCUMENT_ID));

        assertTrue(exception.getMessage().contains("DLC Drill"));
        verify(inventoryLedgerRepository, never()).save(any());
        assertEquals("DRAFT", document.getStatus());
    }

    @Test
    void postExport_missingBalance_usesSkuWhenProductNameIsUnavailable() {
        InventoryDocument document = exportDocument("DRAFT", BigDecimal.ONE);
        ProductVariant variant = ProductVariant.builder()
                .id(VARIANT_ID).variantName(" ").sku("SKU-DRILL-100").build();
        when(inventoryDocumentRepository.findExportByIdWithLines(DOCUMENT_ID)).thenReturn(Optional.of(document));
        when(productVariantRepository.findById(VARIANT_ID)).thenReturn(Optional.of(variant));
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.empty());
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID))
                .thenReturn(List.of());

        BusinessException exception = assertThrows(BusinessException.class, () -> service.postExport(DOCUMENT_ID));

        assertTrue(exception.getMessage().contains("SKU-DRILL-100"));
        verify(inventoryLedgerRepository, never()).save(any());
    }

    @Test
    void postExport_insufficientQuantity_rejectsWithoutConsumingFifo() {
        InventoryDocument document = exportDocument("DRAFT", decimal("6"));
        when(inventoryDocumentRepository.findExportByIdWithLines(DOCUMENT_ID)).thenReturn(Optional.of(document));
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.of(balance(decimal("5"), decimal("100"))));

        assertThrows(BusinessException.class, () -> service.postExport(DOCUMENT_ID));

        verify(inventoryCostLayerRepository, never()).findAvailableLayersForUpdate(any(), any());
        verify(inventoryLedgerRepository, never()).save(any());
    }

    @Test
    void postExport_sufficientQuantity_consumesFifoAndCreatesOutboundLedger() {
        InventoryDocument document = exportDocument("DRAFT", decimal("7"));
        InventoryBalance balance = balance(decimal("20"), decimal("90"));
        InventoryCostLayer first = layer(decimal("5"), decimal("100"), LocalDateTime.of(2026, 1, 1, 0, 0));
        InventoryCostLayer second = layer(decimal("10"), decimal("120"), LocalDateTime.of(2026, 2, 1, 0, 0));
        InventoryCostLayer untouched = layer(decimal("4"), decimal("140"), LocalDateTime.of(2026, 3, 1, 0, 0));
        stubExportDocument(document);
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.of(balance));
        when(inventoryCostLayerRepository.findAvailableLayersForUpdate(WAREHOUSE_ID, VARIANT_ID))
                .thenReturn(List.of(first, second, untouched));

        InventoryDocumentResponse result = service.postExport(DOCUMENT_ID);

        ArgumentCaptor<InventoryLedger> ledgerCaptor = ArgumentCaptor.forClass(InventoryLedger.class);
        verify(inventoryLedgerRepository).save(ledgerCaptor.capture());
        InventoryLedger ledger = ledgerCaptor.getValue();
        assertAll(
                () -> assertEquals("POSTED", result.getStatus()),
                () -> assertDecimal("13", balance.getQuantityOnHand()),
                () -> assertDecimal("0", first.getQuantityLayered()),
                () -> assertDecimal("8", second.getQuantityLayered()),
                () -> assertDecimal("4", untouched.getQuantityLayered()),
                () -> assertEquals("OUT", ledger.getMovementType()),
                () -> assertDecimal("7", ledger.getQuantityOut()),
                () -> assertDecimal("105.7143", ledger.getUnitCost()),
                () -> assertDecimal("13", ledger.getBalanceAfter()));
    }

    @Test
    void postExport_noCostLayer_usesBalanceAverageCostFallback() {
        InventoryDocument document = exportDocument("SUBMITTED", decimal("2"));
        InventoryBalance balance = balance(decimal("10"), decimal("75"));
        stubExportDocument(document);
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.of(balance));
        when(inventoryCostLayerRepository.findAvailableLayersForUpdate(WAREHOUSE_ID, VARIANT_ID))
                .thenReturn(List.of());

        service.postExport(DOCUMENT_ID);

        ArgumentCaptor<InventoryLedger> captor = ArgumentCaptor.forClass(InventoryLedger.class);
        verify(inventoryLedgerRepository).save(captor.capture());
        assertDecimal("75", captor.getValue().getUnitCost());
    }

    @Test
    void postExport_serialTrackedLine_marksSerialSoldAndClearsSerialBalance() {
        InventoryDocument document = exportDocument("DRAFT", BigDecimal.ONE);
        InventoryDocumentLine line = document.getLines().get(0);
        line.setSerialNumberId(901L);
        line.setSerialNumbersText("SN-901");
        SerialNumber serial = SerialNumber.builder()
                .id(901L).variantId(VARIANT_ID).warehouseId(WAREHOUSE_ID)
                .serialNumber("SN-901").status("AVAILABLE").build();
        InventoryBalance generalBalance = balance(decimal("4"), decimal("80"));
        InventoryBalance serialBalance = InventoryBalance.builder()
                .warehouseId(WAREHOUSE_ID).variantId(VARIANT_ID).serialNumberId(901L)
                .stockStatus("GOOD").quantityOnHand(BigDecimal.ONE)
                .quantityReserved(BigDecimal.ZERO).averageCost(decimal("80")).build();
        stubExportDocument(document);
        when(serialNumberRepository.findById(901L)).thenReturn(Optional.of(serial));
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.of(generalBalance));
        when(inventoryCostLayerRepository.findAvailableLayersForUpdate(WAREHOUSE_ID, VARIANT_ID))
                .thenReturn(List.of(layer(BigDecimal.ONE, decimal("80"), LocalDateTime.now())));
        when(inventoryBalanceRepository.findByWarehouseVariantSerialForUpdate(
                WAREHOUSE_ID, VARIANT_ID, 901L, "GOOD")).thenReturn(Optional.of(serialBalance));

        service.postExport(DOCUMENT_ID);

        assertAll(
                () -> assertEquals("SOLD", serial.getStatus()),
                () -> assertNotNull(serial.getSoldAt()),
                () -> assertDecimal("0", serialBalance.getQuantityOnHand()),
                () -> assertDecimal("3", generalBalance.getQuantityOnHand()));
        verify(serialNumberRepository, atLeastOnce()).save(serial);
        verify(inventoryBalanceRepository).save(serialBalance);
    }

    @Test
    void postExport_nullId_rejectsBeforeRepositoryLookup() {
        assertThrows(BusinessException.class, () -> service.postExport(null));

        verify(inventoryDocumentRepository, never()).findExportByIdWithLines(any());
    }

    @Test
    void postExport_missingDocument_rejectsWithoutChangingStock() {
        when(inventoryDocumentRepository.findExportByIdWithLines(999L)).thenReturn(Optional.empty());

        assertThrows(BusinessException.class, () -> service.postExport(999L));

        verify(inventoryBalanceRepository, never()).save(any());
        verify(inventoryLedgerRepository, never()).save(any());
    }

    @Test
    void postExport_missingSerialId_rejectsBeforeChangingBalance() {
        InventoryDocument document = exportDocument("DRAFT", BigDecimal.ONE);
        document.getLines().get(0).setSerialNumberId(999L);
        when(inventoryDocumentRepository.findExportByIdWithLines(DOCUMENT_ID)).thenReturn(Optional.of(document));
        when(serialNumberRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(BusinessException.class, () -> service.postExport(DOCUMENT_ID));

        verify(inventoryBalanceRepository, never()).save(any());
    }

    @Test
    void postExport_unavailableSerial_rejectsBeforeChangingBalance() {
        InventoryDocument document = exportDocument("DRAFT", BigDecimal.ONE);
        document.getLines().get(0).setSerialNumberId(901L);
        SerialNumber serial = exportSerial("SOLD", WAREHOUSE_ID, VARIANT_ID);
        when(inventoryDocumentRepository.findExportByIdWithLines(DOCUMENT_ID)).thenReturn(Optional.of(document));
        when(serialNumberRepository.findById(901L)).thenReturn(Optional.of(serial));

        assertThrows(BusinessException.class, () -> service.postExport(DOCUMENT_ID));

        verify(inventoryBalanceRepository, never()).save(any());
    }

    @Test
    void postExport_serialFromAnotherWarehouse_rejectsBeforeChangingBalance() {
        InventoryDocument document = exportDocument("DRAFT", BigDecimal.ONE);
        document.getLines().get(0).setSerialNumberId(901L);
        SerialNumber serial = exportSerial("AVAILABLE", 2L, VARIANT_ID);
        when(inventoryDocumentRepository.findExportByIdWithLines(DOCUMENT_ID)).thenReturn(Optional.of(document));
        when(serialNumberRepository.findById(901L)).thenReturn(Optional.of(serial));

        assertThrows(BusinessException.class, () -> service.postExport(DOCUMENT_ID));

        verify(inventoryBalanceRepository, never()).save(any());
    }

    @Test
    void postExport_serialForAnotherVariant_rejectsBeforeChangingBalance() {
        InventoryDocument document = exportDocument("DRAFT", BigDecimal.ONE);
        document.getLines().get(0).setSerialNumberId(901L);
        SerialNumber serial = exportSerial("AVAILABLE", WAREHOUSE_ID, 200L);
        when(inventoryDocumentRepository.findExportByIdWithLines(DOCUMENT_ID)).thenReturn(Optional.of(document));
        when(serialNumberRepository.findById(901L)).thenReturn(Optional.of(serial));

        assertThrows(BusinessException.class, () -> service.postExport(DOCUMENT_ID));

        verify(inventoryBalanceRepository, never()).save(any());
    }

    @Test
    void postExport_transferSerialText_marksSerialInTransit() {
        InventoryDocument document = exportDocument("DRAFT", BigDecimal.ONE);
        InventoryDocumentLine line = document.getLines().get(0);
        document.setIssuePurpose(InventoryDocumentService.ISSUE_PURPOSE_TRANSFER_OUT);
        line.setSerialNumbersText("SN-TRANSFER");
        SerialNumber serial = exportSerial("AVAILABLE", WAREHOUSE_ID, VARIANT_ID);
        InventoryBalance aggregateBalance = balance(decimal("3"), decimal("80"));
        InventoryBalance serialBalance = serialBalance(901L, BigDecimal.ONE, decimal("80"));
        stubExportDocument(document);
        when(serialNumberRepository.findByVariantIdAndSerialNumber(VARIANT_ID, "SN-TRANSFER"))
                .thenReturn(Optional.of(serial));
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.of(aggregateBalance));
        when(inventoryCostLayerRepository.findAvailableLayersForUpdate(WAREHOUSE_ID, VARIANT_ID))
                .thenReturn(List.of(layer(BigDecimal.ONE, decimal("80"), LocalDateTime.now())));
        when(inventoryBalanceRepository.findByWarehouseVariantSerialForUpdate(
                WAREHOUSE_ID, VARIANT_ID, 901L, "GOOD")).thenReturn(Optional.of(serialBalance));

        service.postExport(DOCUMENT_ID);

        assertAll(
                () -> assertEquals("IN_TRANSIT", serial.getStatus()),
                () -> assertEquals(901L, line.getSerialNumberId()),
                () -> assertDecimal("0", serialBalance.getQuantityOnHand()));
    }

    @Test
    void postExport_unknownSerialText_rejectsBeforeChangingBalance() {
        InventoryDocument document = exportDocument("DRAFT", BigDecimal.ONE);
        document.getLines().get(0).setSerialNumbersText("SN-MISSING");
        when(inventoryDocumentRepository.findExportByIdWithLines(DOCUMENT_ID)).thenReturn(Optional.of(document));
        when(serialNumberRepository.findByVariantIdAndSerialNumber(VARIANT_ID, "SN-MISSING"))
                .thenReturn(Optional.empty());

        assertThrows(BusinessException.class, () -> service.postExport(DOCUMENT_ID));

        verify(inventoryBalanceRepository, never()).save(any());
        verify(inventoryLedgerRepository, never()).save(any());
    }

    @Test
    void postExport_goodBalanceMissing_usesPositiveFallbackBalance() {
        InventoryDocument document = exportDocument("DRAFT", decimal("2"));
        InventoryBalance emptyBalance = balance(BigDecimal.ZERO, decimal("10"));
        InventoryBalance positiveBalance = balance(decimal("5"), decimal("70"));
        stubExportDocument(document);
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.empty());
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID))
                .thenReturn(List.of(emptyBalance, positiveBalance));
        when(inventoryCostLayerRepository.findAvailableLayersForUpdate(WAREHOUSE_ID, VARIANT_ID))
                .thenReturn(List.of());

        service.postExport(DOCUMENT_ID);

        ArgumentCaptor<InventoryLedger> captor = ArgumentCaptor.forClass(InventoryLedger.class);
        verify(inventoryLedgerRepository).save(captor.capture());
        assertAll(
                () -> assertDecimal("3", positiveBalance.getQuantityOnHand()),
                () -> assertDecimal("70", captor.getValue().getUnitCost()));
    }

    @Test
    void postExport_partialFifo_usesLineCostForRemainingQuantity() {
        InventoryDocument document = exportDocument("DRAFT", decimal("3"));
        InventoryDocumentLine line = document.getLines().get(0);
        line.setUnitCost(decimal("60"));
        InventoryBalance balance = balance(decimal("10"), BigDecimal.ZERO);
        stubExportDocument(document);
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.of(balance));
        when(inventoryCostLayerRepository.findAvailableLayersForUpdate(WAREHOUSE_ID, VARIANT_ID))
                .thenReturn(List.of(layer(BigDecimal.ONE, decimal("100"), LocalDateTime.now())));

        service.postExport(DOCUMENT_ID);

        ArgumentCaptor<InventoryLedger> captor = ArgumentCaptor.forClass(InventoryLedger.class);
        verify(inventoryLedgerRepository).save(captor.capture());
        assertDecimal("73.3333", captor.getValue().getUnitCost());
    }

    @Test
    void postExport_noLayerOrAverageCost_usesVariantCostPrice() {
        InventoryDocument document = exportDocument("DRAFT", decimal("2"));
        ProductVariant variant = ProductVariant.builder()
                .id(VARIANT_ID).costPrice(decimal("55")).salePrice(decimal("90")).build();
        stubExportDocument(document);
        when(productVariantRepository.findById(VARIANT_ID)).thenReturn(Optional.of(variant));
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.of(balance(decimal("5"), BigDecimal.ZERO)));
        when(inventoryCostLayerRepository.findAvailableLayersForUpdate(WAREHOUSE_ID, VARIANT_ID))
                .thenReturn(List.of());

        service.postExport(DOCUMENT_ID);

        ArgumentCaptor<InventoryLedger> captor = ArgumentCaptor.forClass(InventoryLedger.class);
        verify(inventoryLedgerRepository).save(captor.capture());
        assertDecimal("55", captor.getValue().getUnitCost());
    }

    @Test
    void postExport_noCostPrice_usesVariantSalePriceFallback() {
        InventoryDocument document = exportDocument("DRAFT", decimal("2"));
        ProductVariant variant = ProductVariant.builder()
                .id(VARIANT_ID).costPrice(null).salePrice(decimal("90")).build();
        stubExportDocument(document);
        when(productVariantRepository.findById(VARIANT_ID)).thenReturn(Optional.of(variant));
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.of(balance(decimal("5"), BigDecimal.ZERO)));
        when(inventoryCostLayerRepository.findAvailableLayersForUpdate(WAREHOUSE_ID, VARIANT_ID))
                .thenReturn(List.of());

        service.postExport(DOCUMENT_ID);

        ArgumentCaptor<InventoryLedger> captor = ArgumentCaptor.forClass(InventoryLedger.class);
        verify(inventoryLedgerRepository).save(captor.capture());
        assertDecimal("90", captor.getValue().getUnitCost());
    }

    @Test
    void postExport_salesPurpose_createsWarrantyAndFulfillsReservation() {
        InventoryDocument document = exportDocument("DRAFT", BigDecimal.ONE);
        InventoryDocumentLine line = document.getLines().get(0);
        document.setIssuePurpose(InventoryDocumentService.ISSUE_PURPOSE_SALES);
        document.setPartnerId(20L);
        document.setSalesOrderId(30L);
        line.setWarrantyMonths(null);
        ProductVariant variant = ProductVariant.builder()
                .id(VARIANT_ID)
                .product(Product.builder().warrantyPeriodMonths(12).build())
                .build();
        stubExportDocument(document);
        when(productVariantRepository.findById(VARIANT_ID)).thenReturn(Optional.of(variant));
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE_ID, VARIANT_ID, "GOOD"))
                .thenReturn(Optional.of(balance(decimal("5"), decimal("80"))));
        when(inventoryCostLayerRepository.findAvailableLayersForUpdate(WAREHOUSE_ID, VARIANT_ID))
                .thenReturn(List.of());
        when(codeGeneratorService.generateCode("WARRANTIES", "warranty_code", "WAR", 5))
                .thenReturn("WAR00001");

        service.postExport(DOCUMENT_ID);

        ArgumentCaptor<Warranty> warrantyCaptor = ArgumentCaptor.forClass(Warranty.class);
        verify(warrantyRepository).save(warrantyCaptor.capture());
        Warranty warranty = warrantyCaptor.getValue();
        assertAll(
                () -> assertEquals("WAR00001", warranty.getWarrantyCode()),
                () -> assertEquals(20L, warranty.getPartnerId()),
                () -> assertEquals(30L, warranty.getSalesOrderId()),
                () -> assertEquals("ACTIVE", warranty.getWarrantyStatus()),
                () -> assertEquals(1, warranty.getLines().size()),
                () -> assertEquals(LocalDate.of(2027, 8, 9), warranty.getEndDate()));
        verify(salesOrderService).fulfillReservation(eq(30L), eq(VARIANT_ID), eq(WAREHOUSE_ID), eq(BigDecimal.ONE), any());
    }

    private void stubDocumentSave() {
        when(inventoryDocumentRepository.save(any())).thenAnswer(invocation -> {
            InventoryDocument document = invocation.getArgument(0);
            document.setId(DOCUMENT_ID);
            AtomicLong lineId = new AtomicLong(500L);
            document.getLines().forEach(line -> line.setId(lineId.getAndIncrement()));
            return document;
        });
    }

    private void stubImportDocument(InventoryDocument document) {
        when(inventoryDocumentRepository.findImportByIdWithLines(DOCUMENT_ID)).thenReturn(Optional.of(document));
        when(inventoryDocumentRepository.saveAndFlush(document)).thenReturn(document);
        when(inventoryDocumentRepository.save(document)).thenReturn(document);
    }

    private void stubImportDocumentUntilSerialValidation(InventoryDocument document) {
        when(inventoryDocumentRepository.findImportByIdWithLines(DOCUMENT_ID)).thenReturn(Optional.of(document));
        when(inventoryDocumentRepository.saveAndFlush(document)).thenReturn(document);
    }

    private void stubExportDocument(InventoryDocument document) {
        when(inventoryDocumentRepository.findExportByIdWithLines(DOCUMENT_ID)).thenReturn(Optional.of(document));
        when(inventoryDocumentRepository.save(document)).thenReturn(document);
    }

    private InventoryDocumentRequest importRequest(String code, BigDecimal quantity, BigDecimal unitCost) {
        InventoryDocumentLineRequest line = new InventoryDocumentLineRequest();
        line.setVariantId(VARIANT_ID);
        line.setQuantityIn(quantity);
        line.setUnitCost(unitCost);
        InventoryDocumentRequest request = baseRequest(code);
        request.setLines(List.of(line));
        return request;
    }

    private InventoryDocumentRequest exportRequest(String code, BigDecimal quantity) {
        InventoryDocumentLineRequest line = new InventoryDocumentLineRequest();
        line.setVariantId(VARIANT_ID);
        line.setQuantityOut(quantity);
        line.setUnitCost(BigDecimal.ZERO);
        line.setUnitPrice(decimal("100"));
        InventoryDocumentRequest request = baseRequest(code);
        request.setIssuePurpose("USAGE");
        request.setLines(List.of(line));
        return request;
    }

    private InventoryDocumentRequest baseRequest(String code) {
        InventoryDocumentRequest request = new InventoryDocumentRequest();
        request.setDocCode(code);
        request.setWarehouseId(WAREHOUSE_ID);
        request.setDocDate(LocalDate.of(2026, 8, 9));
        request.setCreatedBy(USER_ID);
        return request;
    }

    private InventoryDocument importDocument(String status, BigDecimal quantity, BigDecimal unitCost) {
        InventoryDocument document = document("IN_PO", "NK00050", status);
        InventoryDocumentLine line = InventoryDocumentLine.builder()
                .id(500L).inventoryDocument(document).variantId(VARIANT_ID)
                .quantityIn(quantity).quantityOut(BigDecimal.ZERO).unitCost(unitCost)
                .unitPrice(unitCost).vatRate(BigDecimal.ZERO).vatPercent(BigDecimal.ZERO)
                .lineAmount(quantity.multiply(unitCost)).build();
        document.getLines().add(line);
        return document;
    }

    private InventoryDocument exportDocument(String status, BigDecimal quantity) {
        InventoryDocument document = document("EX_SO", "XK00050", status);
        document.setIssuePurpose("USAGE");
        InventoryDocumentLine line = InventoryDocumentLine.builder()
                .id(500L).inventoryDocument(document).variantId(VARIANT_ID)
                .quantityIn(BigDecimal.ZERO).quantityOut(quantity).unitCost(BigDecimal.ZERO)
                .unitPrice(decimal("100")).vatRate(BigDecimal.ZERO).vatPercent(BigDecimal.ZERO)
                .lineAmount(quantity.multiply(decimal("100"))).build();
        document.getLines().add(line);
        return document;
    }

    private InventoryDocument document(String type, String code, String status) {
        return InventoryDocument.builder()
                .id(DOCUMENT_ID).docCode(code).docType(type).warehouseId(WAREHOUSE_ID)
                .docDate(LocalDate.of(2026, 8, 9)).status(status).createdBy(USER_ID)
                .lines(new ArrayList<>()).build();
    }

    private InventoryBalance balance(BigDecimal quantity, BigDecimal averageCost) {
        return InventoryBalance.builder()
                .id(300L).warehouseId(WAREHOUSE_ID).variantId(VARIANT_ID).stockStatus("GOOD")
                .quantityOnHand(quantity).quantityReserved(BigDecimal.ZERO).averageCost(averageCost)
                .updatedAt(LocalDateTime.now()).build();
    }

    private InventoryCostLayer layer(BigDecimal quantity, BigDecimal unitCost, LocalDateTime createdAt) {
        return InventoryCostLayer.builder()
                .id(400L).warehouseId(WAREHOUSE_ID).variantId(VARIANT_ID)
                .inventoryDocumentLineId(400L).quantityReceived(quantity).quantityLayered(quantity)
                .unitCost(unitCost).createdAt(createdAt).build();
    }

    private ProductVariant serialTrackedVariant() {
        return ProductVariant.builder()
                .id(VARIANT_ID)
                .product(Product.builder().trackSerial(true).build())
                .build();
    }

    private SerialNumber exportSerial(String status, Long warehouseId, Long variantId) {
        return SerialNumber.builder()
                .id(901L)
                .variantId(variantId)
                .warehouseId(warehouseId)
                .serialNumber("SN-TRANSFER")
                .status(status)
                .build();
    }

    private InventoryBalance serialBalance(Long serialId, BigDecimal quantity, BigDecimal averageCost) {
        return InventoryBalance.builder()
                .warehouseId(WAREHOUSE_ID)
                .variantId(VARIANT_ID)
                .serialNumberId(serialId)
                .stockStatus("GOOD")
                .quantityOnHand(quantity)
                .quantityReserved(BigDecimal.ZERO)
                .averageCost(averageCost)
                .build();
    }

    private static BigDecimal decimal(String value) {
        return new BigDecimal(value);
    }

    private static void assertDecimal(String expected, BigDecimal actual) {
        assertEquals(0, decimal(expected).compareTo(actual), () -> "Expected " + expected + " but was " + actual);
    }
}
