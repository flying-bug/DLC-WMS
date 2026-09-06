package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.StockTransferDispatchDTO;
import com.duylongtech.backend.dto.StockTransferLineDTO;
import com.duylongtech.backend.dto.StockTransferReceiptDTO;
import com.duylongtech.backend.dto.StockTransferRequestDTO;
import com.duylongtech.backend.dto.StockTransferResponseDTO;
import com.duylongtech.backend.dto.request.InventoryDocumentRequest;
import com.duylongtech.backend.dto.response.InventoryDocumentLineResponse;
import com.duylongtech.backend.dto.response.InventoryDocumentResponse;
import com.duylongtech.backend.entity.InventoryBalance;
import com.duylongtech.backend.entity.ProductVariant;
import com.duylongtech.backend.entity.SerialNumber;
import com.duylongtech.backend.entity.StockTransfer;
import com.duylongtech.backend.entity.StockTransferLine;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.InventoryBalanceRepository;
import com.duylongtech.backend.repository.ProductVariantRepository;
import com.duylongtech.backend.repository.SerialNumberRepository;
import com.duylongtech.backend.repository.StockTransferLineRepository;
import com.duylongtech.backend.repository.StockTransferRepository;
import com.duylongtech.backend.service.impl.StockTransferServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockTransferServiceImplTest {

    private static final Long TRANSFER_ID = 70L;
    private static final Long FROM_WAREHOUSE_ID = 1L;
    private static final Long TO_WAREHOUSE_ID = 2L;
    private static final Long VARIANT_ID = 100L;
    private static final Long USER_ID = 7L;

    @Mock
    private StockTransferRepository stockTransferRepository;
    @Mock
    private StockTransferLineRepository stockTransferLineRepository;
    @Mock
    private SerialNumberRepository serialNumberRepository;
    @Mock
    private InventoryBalanceRepository inventoryBalanceRepository;
    @Mock
    private ProductVariantRepository productVariantRepository;
    @Mock
    private InventoryDocumentService inventoryDocumentService;
    @Mock
    private CodeGeneratorService codeGeneratorService;

    @InjectMocks
    private StockTransferServiceImpl stockTransferService;

    @Test
    void generateNextTransferCode_returnsGeneratedCode() {
        when(codeGeneratorService.generateCode("stock_transfers", "transfer_code", "CK-", 5))
                .thenReturn("CK-00001");

        String result = stockTransferService.generateNextTransferCode();

        assertEquals("CK-00001", result);
        verifyNoInteractions(stockTransferRepository, stockTransferLineRepository, serialNumberRepository,
                inventoryBalanceRepository, productVariantRepository, inventoryDocumentService);
    }

    @Test
    void getTransferHistory_noFilters_usesFindAllTransfers() {
        when(stockTransferRepository.findAllTransfers()).thenReturn(List.of(transfer("DRAFT")));

        List<StockTransferResponseDTO> result = stockTransferService.getTransferHistory("   ", null, null, "");

        assertEquals(1, result.size());
        assertEquals("CK-00001", result.get(0).getTransferCode());
        verify(stockTransferRepository, never()).searchTransfers(any(), any(), any(), any());
    }

    @Test
    void getTransferHistory_filtersPresent_trimsAndSearches() {
        LocalDate from = LocalDate.of(2026, 8, 1);
        LocalDate to = LocalDate.of(2026, 8, 31);
        when(stockTransferRepository.searchTransfers("CK-", from, to, "DRAFT"))
                .thenReturn(List.of(transfer("DRAFT")));

        List<StockTransferResponseDTO> result = stockTransferService.getTransferHistory(
                "  CK-  ", from, to, "  DRAFT  "
        );

        assertEquals(1, result.size());
        verify(stockTransferRepository).searchTransfers("CK-", from, to, "DRAFT");
        verify(stockTransferRepository, never()).findAllTransfers();
    }

    @Test
    void getTransferHistory_dateOnly_normalizesBlankTextFiltersToNull() {
        LocalDate from = LocalDate.of(2026, 8, 1);
        when(stockTransferRepository.searchTransfers(null, from, null, null)).thenReturn(List.of());

        List<StockTransferResponseDTO> result = stockTransferService.getTransferHistory("   ", from, null, "  ");

        assertEquals(List.of(), result);
        verify(stockTransferRepository).searchTransfers(null, from, null, null);
        verify(stockTransferRepository, never()).findAllTransfers();
    }

    @Test
    void getTransferDetail_missingTransfer_throwsBusinessException() {
        when(stockTransferRepository.findByIdWithLines(999L)).thenReturn(Optional.empty());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.getTransferDetail(999L)
        );

        assertEquals("Không tìm thấy phiếu xuất kho", exception.getMessage());
    }

    @Test
    void getTransferDetail_existingTransfer_mapsSerialJson() {
        StockTransfer transfer = transfer("DRAFT");
        transfer.getLines().get(0).setSerialNumbersText("[\"SN-001\",\"SN-002\"]");
        when(stockTransferRepository.findByIdWithLines(TRANSFER_ID)).thenReturn(Optional.of(transfer));

        StockTransferResponseDTO result = stockTransferService.getTransferDetail(TRANSFER_ID);

        assertAll(
                () -> assertEquals(TRANSFER_ID, result.getId()),
                () -> assertEquals(List.of("SN-001", "SN-002"), result.getLines().get(0).getSerialNumbers()),
                () -> assertEquals(new BigDecimal("50.00"), result.getLines().get(0).getUnitCost())
        );
    }

    @Test
    void getTransferDetail_malformedSerialJson_returnsEmptySerialList() {
        StockTransfer transfer = transfer("DRAFT");
        transfer.getLines().get(0).setSerialNumbersText("not-json");
        when(stockTransferRepository.findByIdWithLines(TRANSFER_ID)).thenReturn(Optional.of(transfer));

        StockTransferResponseDTO result = stockTransferService.getTransferDetail(TRANSFER_ID);

        assertEquals(List.of(), result.getLines().get(0).getSerialNumbers());
    }

    @Test
    void createTransferRequest_sameWarehouse_throwsBusinessException() {
        StockTransferRequestDTO request = request();
        request.setToWarehouseId(FROM_WAREHOUSE_ID);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.createTransferRequest(request, USER_ID)
        );

        assertEquals("Kho nguồn và kho đích phải khác nhau", exception.getMessage());
        verifyNoInteractions(stockTransferRepository, inventoryDocumentService, codeGeneratorService);
    }

    @Test
    void createTransferRequest_nullRequest_rejectsMissingDataPartition() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.createTransferRequest(null, USER_ID)
        );

        assertEquals("Dữ liệu yêu cầu phiếu là bắt buộc", exception.getMessage());
        verifyNoInteractions(stockTransferRepository, inventoryDocumentService, codeGeneratorService);
    }

    @Test
    void createTransferRequest_nullSourceWarehouse_rejectsRequiredField() {
        StockTransferRequestDTO request = request();
        request.setFromWarehouseId(null);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.createTransferRequest(request, USER_ID)
        );

        assertEquals("Kho nguồn là bắt buộc", exception.getMessage());
        verifyNoInteractions(stockTransferRepository, inventoryDocumentService, codeGeneratorService);
    }

    @Test
    void createTransferRequest_nullDestinationWarehouse_rejectsRequiredField() {
        StockTransferRequestDTO request = request();
        request.setToWarehouseId(null);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.createTransferRequest(request, USER_ID)
        );

        assertEquals("Kho đích là bắt buộc", exception.getMessage());
        verifyNoInteractions(stockTransferRepository, inventoryDocumentService, codeGeneratorService);
    }

    @Test
    void createTransferRequest_nullUser_rejectsRequiredField() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.createTransferRequest(request(), null)
        );

        assertEquals("Người tạo phiếu là bắt buộc", exception.getMessage());
        verifyNoInteractions(stockTransferRepository, inventoryDocumentService, codeGeneratorService);
    }

    @Test
    void createTransferRequest_emptyLines_rejectsLowerBoundary() {
        StockTransferRequestDTO request = request();
        request.setLines(List.of());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.createTransferRequest(request, USER_ID)
        );

        assertEquals("Phiếu chuyển kho phải có ít nhất một dòng", exception.getMessage());
        verifyNoInteractions(stockTransferRepository, inventoryDocumentService, codeGeneratorService);
    }

    @Test
    void createTransferRequest_nullLine_rejectsInvalidLinePartition() {
        StockTransferRequestDTO request = request();
        request.setLines(new ArrayList<>());
        request.getLines().add(null);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.createTransferRequest(request, USER_ID)
        );

        assertEquals("lines[0].variantId là bắt buộc", exception.getMessage());
    }

    @Test
    void createTransferRequest_nullVariant_rejectsRequiredLineField() {
        StockTransferRequestDTO request = request();
        request.getLines().get(0).setVariantId(null);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.createTransferRequest(request, USER_ID)
        );

        assertEquals("lines[0].variantId là bắt buộc", exception.getMessage());
    }

    @Test
    void createTransferRequest_nullQuantity_rejectsInvalidQuantityPartition() {
        StockTransferRequestDTO request = request();
        request.getLines().get(0).setQuantity(null);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.createTransferRequest(request, USER_ID)
        );

        assertEquals("lines[0].quantity phải lớn hơn 0", exception.getMessage());
    }

    @Test
    void createTransferRequest_zeroQuantity_rejectsBoundaryValue() {
        StockTransferRequestDTO request = request();
        request.getLines().get(0).setQuantity(BigDecimal.ZERO);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.createTransferRequest(request, USER_ID)
        );

        assertEquals("lines[0].quantity phải lớn hơn 0", exception.getMessage());
    }

    @Test
    void createTransferRequest_negativeQuantity_rejectsBelowBoundary() {
        StockTransferRequestDTO request = request();
        request.getLines().get(0).setQuantity(new BigDecimal("-0.01"));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.createTransferRequest(request, USER_ID)
        );

        assertEquals("lines[0].quantity phải lớn hơn 0", exception.getMessage());
    }

    @Test
    void createTransferRequest_blankCode_usesDefaultsAndSerializesLines() {
        StockTransferRequestDTO request = request();
        request.setTransferCode("   ");
        request.setTransferDate(null);
        request.setStatus(null);
        request.getLines().get(0).setSerialNumbers(List.of("SN-001", "SN-002"));
        when(codeGeneratorService.generateCode("stock_transfers", "transfer_code", "CK-", 5))
                .thenReturn("CK-00001");
        when(stockTransferRepository.save(any(StockTransfer.class)))
                .thenAnswer(invocation -> withId(invocation.getArgument(0), TRANSFER_ID));

        StockTransferResponseDTO result = stockTransferService.createTransferRequest(request, USER_ID);

        ArgumentCaptor<StockTransfer> captor = ArgumentCaptor.forClass(StockTransfer.class);
        verify(stockTransferRepository).save(captor.capture());
        StockTransfer saved = captor.getValue();
        assertAll(
                () -> assertEquals("CK-00001", saved.getTransferCode()),
                () -> assertEquals(LocalDate.now(), saved.getTransferDate()),
                () -> assertEquals("DRAFT", saved.getStatus()),
                () -> assertEquals(USER_ID, saved.getCreatedBy()),
                () -> assertEquals("[\"SN-001\",\"SN-002\"]", saved.getLines().get(0).getSerialNumbersText()),
                () -> assertSame(saved, saved.getLines().get(0).getStockTransfer()),
                () -> assertEquals(List.of("SN-001", "SN-002"), result.getLines().get(0).getSerialNumbers())
        );
        verifyNoInteractions(inventoryDocumentService, inventoryBalanceRepository, productVariantRepository);
    }

    @Test
    void createTransferRequest_missingUnitCost_usesSourceWarehouseAverageCost() {
        StockTransferRequestDTO request = request();
        request.getLines().get(0).setUnitCost(null);
        InventoryBalance balance = InventoryBalance.builder().averageCost(new BigDecimal("35.50")).build();
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(
                FROM_WAREHOUSE_ID, VARIANT_ID, "GOOD"
        )).thenReturn(Optional.of(balance));
        when(stockTransferRepository.save(any(StockTransfer.class)))
                .thenAnswer(invocation -> withId(invocation.getArgument(0), TRANSFER_ID));

        StockTransferResponseDTO result = stockTransferService.createTransferRequest(request, USER_ID);

        assertEquals(new BigDecimal("35.50"), result.getLines().get(0).getUnitCost());
        verifyNoInteractions(productVariantRepository, inventoryDocumentService, codeGeneratorService);
    }

    @Test
    void createTransferRequest_noInventoryCost_usesVariantCostPrice() {
        StockTransferRequestDTO request = request();
        request.getLines().get(0).setUnitCost(null);
        ProductVariant variant = ProductVariant.builder()
                .id(VARIANT_ID).costPrice(new BigDecimal("28.75")).salePrice(new BigDecimal("40.00")).build();
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(
                FROM_WAREHOUSE_ID, VARIANT_ID, "GOOD"
        )).thenReturn(Optional.empty());
        when(productVariantRepository.findById(VARIANT_ID)).thenReturn(Optional.of(variant));
        stubTransferSave();

        StockTransferResponseDTO result = stockTransferService.createTransferRequest(request, USER_ID);

        assertEquals(new BigDecimal("28.75"), result.getLines().get(0).getUnitCost());
    }

    @Test
    void createTransferRequest_zeroVariantCost_usesSalePriceFallback() {
        StockTransferRequestDTO request = request();
        request.getLines().get(0).setUnitCost(BigDecimal.ZERO);
        InventoryBalance balance = InventoryBalance.builder().averageCost(BigDecimal.ZERO).build();
        ProductVariant variant = ProductVariant.builder()
                .id(VARIANT_ID).costPrice(BigDecimal.ZERO).salePrice(new BigDecimal("42.00")).build();
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(
                FROM_WAREHOUSE_ID, VARIANT_ID, "GOOD"
        )).thenReturn(Optional.of(balance));
        when(productVariantRepository.findById(VARIANT_ID)).thenReturn(Optional.of(variant));
        stubTransferSave();

        StockTransferResponseDTO result = stockTransferService.createTransferRequest(request, USER_ID);

        assertEquals(new BigDecimal("42.00"), result.getLines().get(0).getUnitCost());
    }

    @Test
    void createTransferRequest_noCostSource_fallsBackToZero() {
        StockTransferRequestDTO request = request();
        request.getLines().get(0).setUnitCost(null);
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(
                FROM_WAREHOUSE_ID, VARIANT_ID, "GOOD"
        )).thenReturn(Optional.empty());
        when(productVariantRepository.findById(VARIANT_ID)).thenReturn(Optional.empty());
        stubTransferSave();

        StockTransferResponseDTO result = stockTransferService.createTransferRequest(request, USER_ID);

        assertEquals(BigDecimal.ZERO, result.getLines().get(0).getUnitCost());
    }

    @Test
    void createTransferRequest_postedStatus_processesExportAndImport() {
        StockTransferRequestDTO request = request();
        request.setStatus("POSTED");
        InventoryDocumentLineResponse postedLine = new InventoryDocumentLineResponse();
        postedLine.setVariantId(VARIANT_ID);
        postedLine.setUnitCost(new BigDecimal("47.25"));
        stubTransferSave();
        when(inventoryDocumentService.createExport(any(InventoryDocumentRequest.class)))
                .thenReturn(inventoryDocument(801L, List.of()));
        when(inventoryDocumentService.postExport(801L))
                .thenReturn(inventoryDocument(801L, List.of(postedLine)));
        when(inventoryDocumentService.createImport(any(InventoryDocumentRequest.class)))
                .thenReturn(inventoryDocument(802L, List.of()));

        StockTransferResponseDTO result = stockTransferService.createTransferRequest(request, USER_ID);

        ArgumentCaptor<InventoryDocumentRequest> importCaptor = ArgumentCaptor.forClass(InventoryDocumentRequest.class);
        verify(inventoryDocumentService).postExport(801L);
        verify(inventoryDocumentService).createImport(importCaptor.capture());
        verify(inventoryDocumentService).postImport(802L);
        assertAll(
                () -> assertEquals("POSTED", result.getStatus()),
                () -> assertEquals(TO_WAREHOUSE_ID, importCaptor.getValue().getWarehouseId()),
                () -> assertEquals(new BigDecimal("47.25"),
                        importCaptor.getValue().getLines().get(0).getUnitCost())
        );
    }

    @Test
    void updateTransferRequest_missingTransfer_throwsBusinessException() {
        when(stockTransferRepository.findByIdWithLines(999L)).thenReturn(Optional.empty());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.updateTransferRequest(999L, request(), USER_ID)
        );

        assertEquals("Không tìm thấy phiếu xuất kho", exception.getMessage());
    }

    @Test
    void updateTransferRequest_nonEditableStatus_throwsBusinessException() {
        when(stockTransferRepository.findByIdWithLines(TRANSFER_ID))
                .thenReturn(Optional.of(transfer("POSTED")));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.updateTransferRequest(TRANSFER_ID, request(), USER_ID)
        );

        assertEquals("Chỉ được phép sửa phiếu khi ở trạng thái Lưu nháp.", exception.getMessage());
        verify(stockTransferRepository, never()).save(any());
    }

    @Test
    void updateTransferRequest_sameWarehouse_throwsBusinessException() {
        StockTransferRequestDTO request = request();
        request.setToWarehouseId(FROM_WAREHOUSE_ID);
        when(stockTransferRepository.findByIdWithLines(TRANSFER_ID))
                .thenReturn(Optional.of(transfer("DRAFT")));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.updateTransferRequest(TRANSFER_ID, request, USER_ID)
        );

        assertEquals("Kho nguồn và kho đích phải khác nhau", exception.getMessage());
        verify(stockTransferRepository, never()).save(any());
    }

    @Test
    void updateTransferRequest_validRequest_replacesLinesAndSaves() {
        StockTransfer existing = transfer("DRAFT");
        StockTransferRequestDTO request = request();
        request.getLines().get(0).setQuantity(new BigDecimal("5.00"));
        when(stockTransferRepository.findByIdWithLines(TRANSFER_ID)).thenReturn(Optional.of(existing));
        when(stockTransferRepository.save(existing)).thenReturn(existing);

        StockTransferResponseDTO result = stockTransferService.updateTransferRequest(
                TRANSFER_ID, request, USER_ID
        );

        assertAll(
                () -> assertEquals(1, existing.getLines().size()),
                () -> assertEquals(new BigDecimal("5.00"), existing.getLines().get(0).getQuantity()),
                () -> assertEquals(new BigDecimal("5.00"), result.getLines().get(0).getQuantity())
        );
        verify(stockTransferLineRepository).deleteAll(any());
        verifyNoInteractions(inventoryDocumentService);
    }

    @Test
    void updateTransferRequest_submittedWithOmittedFields_preservesDateStatusAndSerializesLines() {
        StockTransfer existing = transfer("SUBMITTED");
        StockTransferRequestDTO request = request();
        request.setTransferDate(null);
        request.setStatus(null);
        request.getLines().get(0).setSerialNumbers(List.of("SN-001"));
        when(stockTransferRepository.findByIdWithLines(TRANSFER_ID)).thenReturn(Optional.of(existing));
        when(stockTransferRepository.save(existing)).thenReturn(existing);

        StockTransferResponseDTO result = stockTransferService.updateTransferRequest(TRANSFER_ID, request, USER_ID);

        assertAll(
                () -> assertEquals("SUBMITTED", result.getStatus()),
                () -> assertEquals(LocalDate.of(2026, 8, 9), result.getTransferDate()),
                () -> assertEquals(List.of("SN-001"), result.getLines().get(0).getSerialNumbers())
        );
        verify(stockTransferLineRepository).deleteAll(any());
        verifyNoInteractions(inventoryDocumentService);
    }

    @Test
    void updateTransferRequest_postedStatus_processesInventoryRoundTrip() {
        StockTransfer existing = transfer("DRAFT");
        StockTransferRequestDTO request = request();
        request.setStatus("POSTED");
        when(stockTransferRepository.findByIdWithLines(TRANSFER_ID)).thenReturn(Optional.of(existing));
        when(stockTransferRepository.save(existing)).thenReturn(existing);
        when(inventoryDocumentService.createExport(any(InventoryDocumentRequest.class)))
                .thenReturn(inventoryDocument(811L, List.of()));
        when(inventoryDocumentService.postExport(811L))
                .thenReturn(inventoryDocument(811L, List.of()));
        when(inventoryDocumentService.createImport(any(InventoryDocumentRequest.class)))
                .thenReturn(inventoryDocument(812L, List.of()));

        StockTransferResponseDTO result = stockTransferService.updateTransferRequest(TRANSFER_ID, request, USER_ID);

        assertEquals("POSTED", result.getStatus());
        verify(inventoryDocumentService).postExport(811L);
        verify(inventoryDocumentService).postImport(812L);
    }

    @Test
    void dispatchTransfer_missingTransfer_throwsBusinessException() {
        when(stockTransferRepository.findById(999L)).thenReturn(Optional.empty());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.dispatchTransfer(999L, new StockTransferDispatchDTO(), USER_ID)
        );

        assertEquals("Không tìm thấy phiếu xuất kho", exception.getMessage());
        verifyNoInteractions(inventoryDocumentService);
    }

    @Test
    void dispatchTransfer_postedTransfer_rejectsInvalidState() {
        when(stockTransferRepository.findById(TRANSFER_ID)).thenReturn(Optional.of(transfer("POSTED")));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.dispatchTransfer(TRANSFER_ID, new StockTransferDispatchDTO(), USER_ID)
        );

        assertEquals("Trạng thái phiếu xuất kho không hợp lệ", exception.getMessage());
        verifyNoInteractions(inventoryDocumentService);
        verify(stockTransferRepository, never()).save(any());
    }

    @Test
    void dispatchTransfer_existingTransfer_createsExportAndSetsInTransit() {
        StockTransfer transfer = transfer("DRAFT");
        InventoryDocumentResponse createdExport = inventoryDocument(801L, List.of());
        when(stockTransferRepository.findById(TRANSFER_ID)).thenReturn(Optional.of(transfer));
        when(inventoryDocumentService.createExport(any(InventoryDocumentRequest.class)))
                .thenReturn(createdExport);
        when(inventoryDocumentService.postExport(801L)).thenReturn(createdExport);
        when(stockTransferRepository.save(transfer)).thenReturn(transfer);

        StockTransferResponseDTO result = stockTransferService.dispatchTransfer(
                TRANSFER_ID,
                StockTransferDispatchDTO.builder().serialNumbers(List.of("IGNORED-SERIAL")).build(),
                USER_ID
        );

        ArgumentCaptor<InventoryDocumentRequest> captor = ArgumentCaptor.forClass(InventoryDocumentRequest.class);
        verify(inventoryDocumentService).createExport(captor.capture());
        InventoryDocumentRequest exportRequest = captor.getValue();
        assertAll(
                () -> assertEquals(FROM_WAREHOUSE_ID, exportRequest.getWarehouseId()),
                () -> assertEquals("TRANSFER_EXPORT", exportRequest.getIssuePurpose()),
                () -> assertEquals("STOCK_TRANSFER", exportRequest.getReferenceType()),
                () -> assertEquals(TRANSFER_ID, exportRequest.getReferenceId()),
                () -> assertEquals(new BigDecimal("3.00"), exportRequest.getLines().get(0).getQuantityOut()),
                () -> assertEquals("IN_TRANSIT", result.getStatus())
        );
        verify(inventoryDocumentService).postExport(801L);
        verify(stockTransferRepository).save(transfer);
    }

    @Test
    void dispatchTransfer_serializedLine_createsOneExportLinePerSerial() {
        StockTransfer transfer = transfer("SUBMITTED");
        transfer.getLines().get(0).setSerialNumbersText("[\"SN-001\",\"SN-002\"]");
        SerialNumber first = SerialNumber.builder().id(901L).variantId(VARIANT_ID).serialNumber("SN-001").build();
        SerialNumber second = SerialNumber.builder().id(902L).variantId(VARIANT_ID).serialNumber("SN-002").build();
        when(stockTransferRepository.findById(TRANSFER_ID)).thenReturn(Optional.of(transfer));
        when(serialNumberRepository.findByVariantIdAndSerialNumber(VARIANT_ID, "SN-001"))
                .thenReturn(Optional.of(first));
        when(serialNumberRepository.findByVariantIdAndSerialNumber(VARIANT_ID, "SN-002"))
                .thenReturn(Optional.of(second));
        when(inventoryDocumentService.createExport(any(InventoryDocumentRequest.class)))
                .thenReturn(inventoryDocument(821L, List.of()));
        when(inventoryDocumentService.postExport(821L)).thenReturn(inventoryDocument(821L, List.of()));
        when(stockTransferRepository.save(transfer)).thenReturn(transfer);

        stockTransferService.dispatchTransfer(TRANSFER_ID, new StockTransferDispatchDTO(), USER_ID);

        ArgumentCaptor<InventoryDocumentRequest> captor = ArgumentCaptor.forClass(InventoryDocumentRequest.class);
        verify(inventoryDocumentService).createExport(captor.capture());
        List<com.duylongtech.backend.dto.request.InventoryDocumentLineRequest> lines = captor.getValue().getLines();
        assertAll(
                () -> assertEquals(2, lines.size()),
                () -> assertEquals(List.of(901L, 902L), lines.stream().map(l -> l.getSerialNumberId()).toList()),
                () -> lines.forEach(l -> assertEquals(BigDecimal.ONE, l.getQuantityOut()))
        );
    }

    @Test
    void dispatchTransfer_missingSerial_rejectsBeforeCreatingExport() {
        StockTransfer transfer = transfer("DRAFT");
        transfer.getLines().get(0).setSerialNumbersText("[\"MISSING-SN\"]");
        when(stockTransferRepository.findById(TRANSFER_ID)).thenReturn(Optional.of(transfer));
        when(serialNumberRepository.findByVariantIdAndSerialNumber(VARIANT_ID, "MISSING-SN"))
                .thenReturn(Optional.empty());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.dispatchTransfer(TRANSFER_ID, new StockTransferDispatchDTO(), USER_ID)
        );

        assertEquals("Không tìm thấy Serial: MISSING-SN", exception.getMessage());
        verify(inventoryDocumentService, never()).createExport(any());
        verify(stockTransferRepository, never()).save(any());
    }

    @Test
    void dispatchTransfer_malformedSerialJson_fallsBackToAggregateLine() {
        StockTransfer transfer = transfer("DRAFT");
        transfer.getLines().get(0).setSerialNumbersText("not-json");
        when(stockTransferRepository.findById(TRANSFER_ID)).thenReturn(Optional.of(transfer));
        when(inventoryDocumentService.createExport(any(InventoryDocumentRequest.class)))
                .thenReturn(inventoryDocument(831L, List.of()));
        when(inventoryDocumentService.postExport(831L)).thenReturn(inventoryDocument(831L, List.of()));
        when(stockTransferRepository.save(transfer)).thenReturn(transfer);

        stockTransferService.dispatchTransfer(TRANSFER_ID, new StockTransferDispatchDTO(), USER_ID);

        ArgumentCaptor<InventoryDocumentRequest> captor = ArgumentCaptor.forClass(InventoryDocumentRequest.class);
        verify(inventoryDocumentService).createExport(captor.capture());
        assertAll(
                () -> assertEquals(1, captor.getValue().getLines().size()),
                () -> assertEquals(new BigDecimal("3.00"), captor.getValue().getLines().get(0).getQuantityOut()),
                () -> assertEquals(null, captor.getValue().getLines().get(0).getSerialNumberId())
        );
        verifyNoInteractions(serialNumberRepository);
    }

    @Test
    void receiveTransfer_missingTransfer_throwsBusinessException() {
        when(stockTransferRepository.findById(999L)).thenReturn(Optional.empty());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.receiveTransfer(999L, new StockTransferReceiptDTO(), USER_ID)
        );

        assertEquals("Không tìm thấy phiếu xuất kho", exception.getMessage());
    }

    @Test
    void receiveTransfer_invalidState_throwsBusinessException() {
        when(stockTransferRepository.findById(TRANSFER_ID))
                .thenReturn(Optional.of(transfer("DRAFT")));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.receiveTransfer(TRANSFER_ID, new StockTransferReceiptDTO(), USER_ID)
        );

        assertEquals("Trạng thái phiếu xuất kho không hợp lệ", exception.getMessage());
        verifyNoInteractions(inventoryDocumentService);
    }

    @Test
    void receiveTransfer_inTransit_usesExportedCostCreatesImportAndPosts() {
        StockTransfer transfer = transfer("IN_TRANSIT");
        InventoryDocumentLineResponse exportedLine = new InventoryDocumentLineResponse();
        exportedLine.setVariantId(VARIANT_ID);
        exportedLine.setUnitCost(new BigDecimal("42.25"));
        InventoryDocumentResponse exportHistory = inventoryDocument(801L, List.of(exportedLine));
        InventoryDocumentResponse createdImport = inventoryDocument(802L, List.of());
        when(stockTransferRepository.findById(TRANSFER_ID)).thenReturn(Optional.of(transfer));
        when(inventoryDocumentService.getExportHistory(
                null, null, null, "POSTED", FROM_WAREHOUSE_ID,
                "TRANSFER_EXPORT", "STOCK_TRANSFER", TRANSFER_ID
        )).thenReturn(List.of(exportHistory));
        when(inventoryDocumentService.createImport(any(InventoryDocumentRequest.class)))
                .thenReturn(createdImport);
        when(stockTransferRepository.save(transfer)).thenReturn(transfer);

        StockTransferResponseDTO result = stockTransferService.receiveTransfer(
                TRANSFER_ID,
                StockTransferReceiptDTO.builder().serialNumbers(List.of("IGNORED-SERIAL")).build(),
                USER_ID
        );

        ArgumentCaptor<InventoryDocumentRequest> captor = ArgumentCaptor.forClass(InventoryDocumentRequest.class);
        verify(inventoryDocumentService).createImport(captor.capture());
        InventoryDocumentRequest importRequest = captor.getValue();
        assertAll(
                () -> assertEquals(TO_WAREHOUSE_ID, importRequest.getWarehouseId()),
                () -> assertEquals("TRANSFER_IMPORT", importRequest.getIssuePurpose()),
                () -> assertEquals(new BigDecimal("3.00"), importRequest.getLines().get(0).getQuantityIn()),
                () -> assertEquals(new BigDecimal("42.25"), importRequest.getLines().get(0).getUnitCost()),
                () -> assertEquals("POSTED", result.getStatus())
        );
        verify(inventoryDocumentService).postImport(802L);
    }

    @Test
    void receiveTransfer_emptyExportHistory_fallsBackToBalanceCostAndPersistsLineCost() {
        StockTransfer transfer = transfer("IN_TRANSIT");
        StockTransferLine transferLine = transfer.getLines().get(0);
        transferLine.setUnitCost(null);
        InventoryBalance balance = InventoryBalance.builder().averageCost(new BigDecimal("33.00")).build();
        when(stockTransferRepository.findById(TRANSFER_ID)).thenReturn(Optional.of(transfer));
        when(inventoryDocumentService.getExportHistory(
                null, null, null, "POSTED", FROM_WAREHOUSE_ID,
                "TRANSFER_EXPORT", "STOCK_TRANSFER", TRANSFER_ID
        )).thenReturn(List.of());
        when(inventoryBalanceRepository.findByWarehouseAndVariantForUpdate(
                FROM_WAREHOUSE_ID, VARIANT_ID, "GOOD"
        )).thenReturn(Optional.of(balance));
        when(inventoryDocumentService.createImport(any(InventoryDocumentRequest.class)))
                .thenReturn(inventoryDocument(842L, List.of()));
        when(stockTransferRepository.save(transfer)).thenReturn(transfer);

        stockTransferService.receiveTransfer(TRANSFER_ID, new StockTransferReceiptDTO(), USER_ID);

        ArgumentCaptor<InventoryDocumentRequest> captor = ArgumentCaptor.forClass(InventoryDocumentRequest.class);
        verify(inventoryDocumentService).createImport(captor.capture());
        verify(stockTransferLineRepository).save(transferLine);
        assertAll(
                () -> assertEquals(new BigDecimal("33.00"), transferLine.getUnitCost()),
                () -> assertEquals(new BigDecimal("33.00"), captor.getValue().getLines().get(0).getUnitCost())
        );
        verify(inventoryDocumentService).postImport(842L);
    }

    @Test
    void receiveTransfer_serializedLine_copiesSerialsToImportRequest() {
        StockTransfer transfer = transfer("IN_TRANSIT");
        transfer.getLines().get(0).setSerialNumbersText("[\"SN-001\",\"SN-002\"]");
        InventoryDocumentLineResponse exportedLine = new InventoryDocumentLineResponse();
        exportedLine.setVariantId(VARIANT_ID);
        exportedLine.setUnitCost(new BigDecimal("42.25"));
        when(stockTransferRepository.findById(TRANSFER_ID)).thenReturn(Optional.of(transfer));
        when(inventoryDocumentService.getExportHistory(
                null, null, null, "POSTED", FROM_WAREHOUSE_ID,
                "TRANSFER_EXPORT", "STOCK_TRANSFER", TRANSFER_ID
        )).thenReturn(List.of(inventoryDocument(851L, List.of(exportedLine))));
        when(inventoryDocumentService.createImport(any(InventoryDocumentRequest.class)))
                .thenReturn(inventoryDocument(852L, List.of()));
        when(stockTransferRepository.save(transfer)).thenReturn(transfer);

        stockTransferService.receiveTransfer(TRANSFER_ID, new StockTransferReceiptDTO(), USER_ID);

        ArgumentCaptor<InventoryDocumentRequest> captor = ArgumentCaptor.forClass(InventoryDocumentRequest.class);
        verify(inventoryDocumentService).createImport(captor.capture());
        assertEquals(List.of("SN-001", "SN-002"), captor.getValue().getLines().get(0).getSerialNumbers());
        verify(inventoryDocumentService).postImport(852L);
    }

    @Test
    void receiveTransfer_malformedSerialJson_omitsSerialsFromImportRequest() {
        StockTransfer transfer = transfer("IN_TRANSIT");
        transfer.getLines().get(0).setSerialNumbersText("not-json");
        when(stockTransferRepository.findById(TRANSFER_ID)).thenReturn(Optional.of(transfer));
        when(inventoryDocumentService.getExportHistory(
                null, null, null, "POSTED", FROM_WAREHOUSE_ID,
                "TRANSFER_EXPORT", "STOCK_TRANSFER", TRANSFER_ID
        )).thenReturn(null);
        when(inventoryDocumentService.createImport(any(InventoryDocumentRequest.class)))
                .thenReturn(inventoryDocument(862L, List.of()));
        when(stockTransferRepository.save(transfer)).thenReturn(transfer);

        stockTransferService.receiveTransfer(TRANSFER_ID, new StockTransferReceiptDTO(), USER_ID);

        ArgumentCaptor<InventoryDocumentRequest> captor = ArgumentCaptor.forClass(InventoryDocumentRequest.class);
        verify(inventoryDocumentService).createImport(captor.capture());
        assertEquals(null, captor.getValue().getLines().get(0).getSerialNumbers());
        verify(inventoryDocumentService).postImport(862L);
    }

    @Test
    void getAllTransfers_mapsEveryTransfer() {
        when(stockTransferRepository.findAll()).thenReturn(List.of(transfer("DRAFT"), transfer("POSTED")));

        List<StockTransferResponseDTO> result = stockTransferService.getAllTransfers();

        assertEquals(2, result.size());
        assertEquals(List.of("DRAFT", "POSTED"), result.stream().map(StockTransferResponseDTO::getStatus).toList());
    }

    @Test
    void getTransferById_missingTransfer_throwsBusinessException() {
        when(stockTransferRepository.findById(999L)).thenReturn(Optional.empty());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stockTransferService.getTransferById(999L)
        );

        assertEquals("Không tìm thấy phiếu xuất kho", exception.getMessage());
    }

    @Test
    void getTransferById_existingTransfer_returnsMappedResponse() {
        StockTransfer transfer = transfer("DRAFT");
        when(stockTransferRepository.findById(TRANSFER_ID)).thenReturn(Optional.of(transfer));

        StockTransferResponseDTO result = stockTransferService.getTransferById(TRANSFER_ID);

        assertAll(
                () -> assertEquals(TRANSFER_ID, result.getId()),
                () -> assertEquals("CK-00001", result.getTransferCode()),
                () -> assertEquals(1, result.getLines().size())
        );
    }

    private void stubTransferSave() {
        when(stockTransferRepository.save(any(StockTransfer.class)))
                .thenAnswer(invocation -> withId(invocation.getArgument(0), TRANSFER_ID));
    }

    private static StockTransferRequestDTO request() {
        return StockTransferRequestDTO.builder()
                .transferCode("CK-00001")
                .fromWarehouseId(FROM_WAREHOUSE_ID)
                .toWarehouseId(TO_WAREHOUSE_ID)
                .transferDate(LocalDate.of(2026, 8, 9))
                .status("DRAFT")
                .note("Chuyển hàng")
                .lines(new ArrayList<>(List.of(StockTransferLineDTO.builder()
                        .variantId(VARIANT_ID)
                        .quantity(new BigDecimal("3.00"))
                        .unitCost(new BigDecimal("50.00"))
                        .serialNumbers(new ArrayList<>())
                        .build())))
                .build();
    }

    private static StockTransfer transfer(String status) {
        StockTransfer transfer = StockTransfer.builder()
                .id(TRANSFER_ID)
                .transferCode("CK-00001")
                .fromWarehouseId(FROM_WAREHOUSE_ID)
                .toWarehouseId(TO_WAREHOUSE_ID)
                .transferDate(LocalDate.of(2026, 8, 9))
                .status(status)
                .createdBy(USER_ID)
                .build();
        transfer.getLines().add(StockTransferLine.builder()
                .id(701L)
                .stockTransfer(transfer)
                .variantId(VARIANT_ID)
                .quantity(new BigDecimal("3.00"))
                .unitCost(new BigDecimal("50.00"))
                .build());
        return transfer;
    }

    private static StockTransfer withId(StockTransfer transfer, Long id) {
        transfer.setId(id);
        return transfer;
    }

    private static InventoryDocumentResponse inventoryDocument(
            Long id,
            List<InventoryDocumentLineResponse> lines
    ) {
        InventoryDocumentResponse response = new InventoryDocumentResponse();
        response.setId(id);
        response.setLines(lines);
        return response;
    }
}
