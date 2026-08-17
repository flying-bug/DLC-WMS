package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.StocktakeLineRequest;
import com.duylongtech.backend.dto.request.StocktakeLineSerialRequest;
import com.duylongtech.backend.dto.request.StocktakeParticipantRequest;
import com.duylongtech.backend.dto.request.StocktakeRequest;
import com.duylongtech.backend.dto.response.StocktakeResponse;
import com.duylongtech.backend.entity.SerialNumber;
import com.duylongtech.backend.entity.Stocktake;
import com.duylongtech.backend.entity.StocktakeLine;
import com.duylongtech.backend.entity.StocktakeLineSerial;
import com.duylongtech.backend.entity.StocktakeParticipant;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.ProductVariantRepository;
import com.duylongtech.backend.repository.SerialNumberRepository;
import com.duylongtech.backend.repository.StocktakeRepository;
import com.duylongtech.backend.repository.WarehouseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StocktakeServiceTest {

    private static final Long STOCKTAKE_ID = 50L;
    private static final Long WAREHOUSE_ID = 1L;
    private static final Long VARIANT_ID = 100L;
    private static final Long CREATOR_ID = 7L;

    @Mock
    private StocktakeRepository stocktakeRepository;
    @Mock
    private CodeGeneratorService codeGeneratorService;
    @Mock
    private ProductVariantRepository productVariantRepository;
    @Mock
    private WarehouseRepository warehouseRepository;
    @Mock
    private InventoryDocumentService inventoryDocumentService;
    @Mock
    private SerialNumberRepository serialNumberRepository;

    private StocktakeService stocktakeService;

    @BeforeEach
    void setUp() {
        stocktakeService = new StocktakeService(
                stocktakeRepository,
                codeGeneratorService,
                productVariantRepository,
                warehouseRepository,
                inventoryDocumentService,
                serialNumberRepository
        );
    }

    @Test
    void generateNextStocktakeCode_returnsGeneratedCode() {
        when(codeGeneratorService.generateCode("stocktakes", "stocktake_code", "KK", 6))
                .thenReturn("KK000123");

        String result = stocktakeService.generateNextStocktakeCode();

        assertEquals("KK000123", result);
        verifyNoInteractions(stocktakeRepository, productVariantRepository, warehouseRepository,
                inventoryDocumentService, serialNumberRepository);
    }

    @Test
    void searchStocktakes_blankFilters_normalizesToNull() {
        Pageable pageable = PageRequest.of(0, 20);
        when(stocktakeRepository.searchStocktakes(null, null, null, null, pageable))
                .thenReturn(Page.empty(pageable));

        Page<StocktakeResponse> result = stocktakeService.searchStocktakes("   ", "", null, null, pageable);

        assertEquals(0, result.getTotalElements());
        verify(stocktakeRepository).searchStocktakes(null, null, null, null, pageable);
        verifyNoInteractions(codeGeneratorService, productVariantRepository, warehouseRepository,
                inventoryDocumentService, serialNumberRepository);
    }

    @Test
    void searchStocktakes_nonBlankFilters_trimsAndMapsResult() {
        Pageable pageable = PageRequest.of(0, 10);
        LocalDate fromDate = LocalDate.of(2026, 8, 1);
        LocalDate toDate = LocalDate.of(2026, 8, 31);
        Stocktake stocktake = stocktake("KK000001", "DRAFT");
        when(stocktakeRepository.searchStocktakes("KK000", "DRAFT", fromDate, toDate, pageable))
                .thenReturn(new PageImpl<>(List.of(stocktake), pageable, 1));

        Page<StocktakeResponse> result = stocktakeService.searchStocktakes(
                "  KK000  ", "  DRAFT  ", fromDate, toDate, pageable
        );

        assertAll(
                () -> assertEquals(1, result.getTotalElements()),
                () -> assertEquals("KK000001", result.getContent().get(0).getStocktakeCode()),
                () -> assertEquals("DRAFT", result.getContent().get(0).getStatus())
        );
        verify(stocktakeRepository).searchStocktakes("KK000", "DRAFT", fromDate, toDate, pageable);
    }

    @Test
    void getStocktakeDetail_missingStocktake_throwsBusinessException() {
        when(stocktakeRepository.findByIdWithDetails(999L)).thenReturn(Optional.empty());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stocktakeService.getStocktakeDetail(999L)
        );

        assertEquals("Không tìm thấy phiếu kiểm kê", exception.getMessage());
        verifyNoInteractions(codeGeneratorService, productVariantRepository, warehouseRepository,
                inventoryDocumentService, serialNumberRepository);
    }

    @Test
    void getStocktakeDetail_existingStocktake_mapsLinesSerialsAndParticipants() {
        Stocktake stocktake = stocktake("KK000001", "DRAFT");
        StocktakeLine line = stocktakeLine(stocktake);
        line.getSerials().add(StocktakeLineSerial.builder()
                .id(301L)
                .stocktakeLine(line)
                .serialNumberId(401L)
                .serialNumber("SN-001")
                .scanStatus("MATCHED")
                .note("Đã quét")
                .build());
        stocktake.getLines().add(line);
        stocktake.getParticipants().add(StocktakeParticipant.builder()
                .id(201L)
                .stocktake(stocktake)
                .fullName("Nguyễn Văn A")
                .title("Thủ kho")
                .represent("Kho chính")
                .build());
        when(stocktakeRepository.findByIdWithDetails(STOCKTAKE_ID)).thenReturn(Optional.of(stocktake));

        StocktakeResponse result = stocktakeService.getStocktakeDetail(STOCKTAKE_ID);

        assertAll(
                () -> assertEquals(STOCKTAKE_ID, result.getId()),
                () -> assertEquals(1, result.getLines().size()),
                () -> assertEquals(VARIANT_ID, result.getLines().get(0).getVariantId()),
                () -> assertEquals("SN-001", result.getLines().get(0).getSerials().get(0).getSerialNumber()),
                () -> assertEquals("MATCHED", result.getLines().get(0).getSerials().get(0).getScanStatus()),
                () -> assertEquals(1, result.getParticipants().size()),
                () -> assertEquals("Nguyễn Văn A", result.getParticipants().get(0).getFullName())
        );
        verify(warehouseRepository).findById(WAREHOUSE_ID);
        verify(productVariantRepository).findById(VARIANT_ID);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(longs = {1L})
    void getAvailableSerials_missingRequiredId_returnsEmptyList(Long warehouseId) {
        Long variantId = warehouseId == null ? VARIANT_ID : null;

        List<SerialNumber> result = stocktakeService.getAvailableSerials(warehouseId, variantId);

        assertEquals(List.of(), result);
        verifyNoInteractions(serialNumberRepository);
    }

    @Test
    void getAvailableSerials_validIds_returnsAvailableSerials() {
        SerialNumber serial = serial(401L, "SN-001", "AVAILABLE", WAREHOUSE_ID);
        when(serialNumberRepository.findByWarehouseIdAndVariantIdAndStatus(
                WAREHOUSE_ID, VARIANT_ID, "AVAILABLE"
        )).thenReturn(List.of(serial));

        List<SerialNumber> result = stocktakeService.getAvailableSerials(WAREHOUSE_ID, VARIANT_ID);

        assertEquals(List.of(serial), result);
    }

    @Test
    void createStocktake_nullRequest_throwsBusinessException() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stocktakeService.createStocktake(null)
        );

        assertEquals("Dữ liệu không hợp lệ", exception.getMessage());
        verifyNoInteractions(stocktakeRepository, codeGeneratorService, productVariantRepository,
                warehouseRepository, inventoryDocumentService, serialNumberRepository);
    }

    @Test
    void createStocktake_missingWarehouse_throwsBusinessException() {
        StocktakeRequest request = validRequest();
        request.setWarehouseId(null);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stocktakeService.createStocktake(request)
        );

        assertEquals("Kho kiểm kê là bắt buộc", exception.getMessage());
        verifyNoInteractions(stocktakeRepository, codeGeneratorService);
    }

    @Test
    void createStocktake_emptyLines_throwsBusinessException() {
        StocktakeRequest request = validRequest();
        request.setLines(List.of());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stocktakeService.createStocktake(request)
        );

        assertEquals("Phiếu kiểm kê phải có ít nhất một dòng", exception.getMessage());
        verifyNoInteractions(stocktakeRepository, codeGeneratorService);
    }

    @Test
    void createStocktake_missingCreatedBy_throwsBusinessException() {
        StocktakeRequest request = validRequest();
        request.setCreatedBy(null);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stocktakeService.createStocktake(request)
        );

        assertEquals("Người tạo là bắt buộc", exception.getMessage());
        verifyNoInteractions(stocktakeRepository, codeGeneratorService);
    }

    @Test
    void createStocktake_nullVariantInLine_throwsBusinessException() {
        StocktakeRequest request = validRequest();
        request.getLines().get(0).setVariantId(null);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stocktakeService.createStocktake(request)
        );

        assertEquals("Vui lòng chọn sản phẩm cho tất cả các dòng kiểm kê.", exception.getMessage());
        verifyNoInteractions(stocktakeRepository, codeGeneratorService);
    }

    @Test
    void createStocktake_duplicateVariantInLines_throwsBusinessException() {
        StocktakeRequest request = validRequest();
        StocktakeLineRequest duplicateLine = StocktakeLineRequest.builder()
                .variantId(VARIANT_ID)
                .bookQty(new BigDecimal("5.00"))
                .countQty(new BigDecimal("5.00"))
                .diffQty(BigDecimal.ZERO)
                .goodQty(new BigDecimal("5.00"))
                .badQty(BigDecimal.ZERO)
                .lostQty(BigDecimal.ZERO)
                .action("NONE")
                .build();
        request.setLines(List.of(request.getLines().get(0), duplicateLine));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stocktakeService.createStocktake(request)
        );

        assertEquals("Danh sách kiểm kê không được chứa sản phẩm trùng nhau.", exception.getMessage());
        verifyNoInteractions(stocktakeRepository, codeGeneratorService);
    }

    @Test
    void createStocktake_duplicateCustomCode_throwsBusinessException() {
        StocktakeRequest request = validRequest();
        request.setStocktakeCode("  KK-CUSTOM  ");
        when(stocktakeRepository.existsByStocktakeCode("KK-CUSTOM")).thenReturn(true);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stocktakeService.createStocktake(request)
        );

        assertEquals("Mã kiểm kê đã tồn tại: KK-CUSTOM", exception.getMessage());
        verify(stocktakeRepository, never()).save(any());
        verifyNoInteractions(codeGeneratorService);
    }

    @Test
    void createStocktake_generatedCode_mapsChildrenAndDefaults() {
        StocktakeRequest request = validRequest();
        request.setStocktakeCode("   ");
        request.setStocktakeDate(null);
        request.getLines().get(0).setSerials(List.of(StocktakeLineSerialRequest.builder()
                .serialNumberId(401L)
                .serialNumber("SN-001")
                .scanStatus(null)
                .note("Đã kiểm")
                .build()));
        request.setParticipants(List.of(StocktakeParticipantRequest.builder()
                .fullName("Nguyễn Văn A")
                .title("Thủ kho")
                .represent("Kho chính")
                .build()));
        when(codeGeneratorService.generateCode("stocktakes", "stocktake_code", "KK", 6))
                .thenReturn("KK000001");
        when(stocktakeRepository.existsByStocktakeCode("KK000001")).thenReturn(false);
        when(stocktakeRepository.save(any(Stocktake.class)))
                .thenAnswer(invocation -> withId(invocation.getArgument(0), STOCKTAKE_ID));

        StocktakeResponse result = stocktakeService.createStocktake(request);

        ArgumentCaptor<Stocktake> captor = ArgumentCaptor.forClass(Stocktake.class);
        verify(stocktakeRepository).save(captor.capture());
        Stocktake saved = captor.getValue();
        assertAll(
                () -> assertEquals("KK000001", saved.getStocktakeCode()),
                () -> assertEquals("DRAFT", saved.getStatus()),
                () -> assertEquals(LocalDate.now(), saved.getStocktakeDate()),
                () -> assertEquals(1, saved.getLines().size()),
                () -> assertSame(saved, saved.getLines().get(0).getStocktake()),
                () -> assertEquals("MATCHED", saved.getLines().get(0).getSerials().get(0).getScanStatus()),
                () -> assertSame(saved.getLines().get(0),
                        saved.getLines().get(0).getSerials().get(0).getStocktakeLine()),
                () -> assertEquals(1, saved.getParticipants().size()),
                () -> assertSame(saved, saved.getParticipants().get(0).getStocktake()),
                () -> assertEquals(STOCKTAKE_ID, result.getId()),
                () -> assertEquals("KK000001", result.getStocktakeCode())
        );
    }

    @Test
    void updateStocktake_missingStocktake_throwsBusinessException() {
        StocktakeRequest request = validRequest();
        when(stocktakeRepository.findByIdWithDetails(999L)).thenReturn(Optional.empty());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stocktakeService.updateStocktake(999L, request)
        );

        assertEquals("Không tìm thấy phiếu kiểm kê", exception.getMessage());
        verify(stocktakeRepository, never()).save(any());
    }

    @Test
    void updateStocktake_postedStocktake_throwsBusinessException() {
        StocktakeRequest request = validRequest();
        Stocktake stocktake = stocktake("KK000001", "POSTED");
        when(stocktakeRepository.findByIdWithDetails(STOCKTAKE_ID)).thenReturn(Optional.of(stocktake));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stocktakeService.updateStocktake(STOCKTAKE_ID, request)
        );

        assertEquals("Chỉ có thể cập nhật phiếu lưu tạm", exception.getMessage());
        verify(stocktakeRepository, never()).save(any());
    }

    @Test
    void updateStocktake_changedCodeAlreadyExists_throwsBusinessException() {
        StocktakeRequest request = validRequest();
        request.setStocktakeCode("  KK000002  ");
        Stocktake stocktake = stocktake("KK000001", "DRAFT");
        when(stocktakeRepository.findByIdWithDetails(STOCKTAKE_ID)).thenReturn(Optional.of(stocktake));
        when(stocktakeRepository.existsByStocktakeCode("KK000002")).thenReturn(true);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stocktakeService.updateStocktake(STOCKTAKE_ID, request)
        );

        assertEquals("Mã phiếu kiểm kê đã tồn tại", exception.getMessage());
        verify(stocktakeRepository, never()).save(any());
    }

    @Test
    void updateStocktake_validRequest_replacesChildrenAndPreservesDateWhenOmitted() {
        Stocktake existing = stocktake("KK000001", "DRAFT");
        LocalDate originalDate = LocalDate.of(2026, 8, 1);
        existing.setStocktakeDate(originalDate);
        existing.getLines().add(stocktakeLine(existing));
        existing.getParticipants().add(StocktakeParticipant.builder()
                .stocktake(existing)
                .fullName("Người cũ")
                .build());
        StocktakeRequest request = validRequest();
        request.setStocktakeCode("KK000001");
        request.setStocktakeDate(null);
        request.setPurpose("Kiểm kê cuối tháng");
        when(stocktakeRepository.findByIdWithDetails(STOCKTAKE_ID)).thenReturn(Optional.of(existing));
        when(stocktakeRepository.save(existing)).thenReturn(existing);

        StocktakeResponse result = stocktakeService.updateStocktake(STOCKTAKE_ID, request);

        assertAll(
                () -> assertEquals("KK000001", existing.getStocktakeCode()),
                () -> assertEquals(originalDate, existing.getStocktakeDate()),
                () -> assertEquals("Kiểm kê cuối tháng", existing.getPurpose()),
                () -> assertEquals(1, existing.getLines().size()),
                () -> assertEquals(0, existing.getParticipants().size()),
                () -> assertEquals("KK000001", result.getStocktakeCode())
        );
        verify(stocktakeRepository, never()).existsByStocktakeCode(any());
    }

    @Test
    void updateStocktake_changedUniqueCode_updatesCode() {
        Stocktake existing = stocktake("KK000001", "DRAFT");
        StocktakeRequest request = validRequest();
        request.setStocktakeCode("  KK000002  ");
        when(stocktakeRepository.findByIdWithDetails(STOCKTAKE_ID)).thenReturn(Optional.of(existing));
        when(stocktakeRepository.existsByStocktakeCode("KK000002")).thenReturn(false);
        when(stocktakeRepository.save(existing)).thenReturn(existing);

        StocktakeResponse result = stocktakeService.updateStocktake(STOCKTAKE_ID, request);

        assertEquals("KK000002", result.getStocktakeCode());
    }

    @Test
    void postStocktake_missingStocktake_throwsBusinessException() {
        when(stocktakeRepository.findByIdWithDetails(999L)).thenReturn(Optional.empty());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stocktakeService.postStocktake(999L, CREATOR_ID)
        );

        assertEquals("Không tìm thấy phiếu kiểm kê", exception.getMessage());
        verifyNoInteractions(serialNumberRepository, inventoryDocumentService);
    }

    @Test
    void postStocktake_nonDraftStocktake_throwsBusinessException() {
        Stocktake stocktake = stocktake("KK000001", "POSTED");
        when(stocktakeRepository.findByIdWithDetails(STOCKTAKE_ID)).thenReturn(Optional.of(stocktake));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> stocktakeService.postStocktake(STOCKTAKE_ID, CREATOR_ID)
        );

        assertEquals("Chỉ phiếu lưu tạm mới có thể xử lý chênh lệch", exception.getMessage());
        verify(stocktakeRepository, never()).save(any());
        verifyNoInteractions(serialNumberRepository, inventoryDocumentService);
    }

    @Test
    void postStocktake_draft_processesSerialDifferencesAndPosts() {
        Stocktake stocktake = stocktake("KK000001", "DRAFT");
        StocktakeLine line = stocktakeLine(stocktake);
        line.getSerials().addAll(List.of(
                stocktakeSerial(line, 401L, "SN-MISSING", "MISSING"),
                stocktakeSerial(line, null, "SN-MISSING-NO-ID", "MISSING"),
                stocktakeSerial(line, null, "SN-EXIST", "UNEXPECTED"),
                stocktakeSerial(line, null, "SN-NEW", "UNEXPECTED"),
                stocktakeSerial(line, 405L, "SN-MATCHED", "MATCHED")
        ));
        stocktake.getLines().add(line);
        SerialNumber missing = serial(401L, "SN-MISSING", "AVAILABLE", WAREHOUSE_ID);
        SerialNumber unexpectedExisting = serial(402L, "SN-EXIST", "SOLD", 2L);
        when(stocktakeRepository.findByIdWithDetails(STOCKTAKE_ID)).thenReturn(Optional.of(stocktake));
        when(serialNumberRepository.findById(401L)).thenReturn(Optional.of(missing));
        when(serialNumberRepository.findByVariantIdAndSerialNumber(VARIANT_ID, "SN-EXIST"))
                .thenReturn(Optional.of(unexpectedExisting));
        when(serialNumberRepository.findByVariantIdAndSerialNumber(VARIANT_ID, "SN-NEW"))
                .thenReturn(Optional.empty());
        when(stocktakeRepository.save(stocktake)).thenReturn(stocktake);

        StocktakeResponse result = stocktakeService.postStocktake(STOCKTAKE_ID, CREATOR_ID);

        ArgumentCaptor<SerialNumber> serialCaptor = ArgumentCaptor.forClass(SerialNumber.class);
        verify(serialNumberRepository, times(3)).save(serialCaptor.capture());
        SerialNumber created = serialCaptor.getAllValues().stream()
                .filter(serial -> "SN-NEW".equals(serial.getSerialNumber()))
                .findFirst()
                .orElseThrow();
        assertAll(
                () -> assertEquals("LOST", missing.getStatus()),
                () -> assertEquals("AVAILABLE", unexpectedExisting.getStatus()),
                () -> assertEquals(WAREHOUSE_ID, unexpectedExisting.getWarehouseId()),
                () -> assertEquals(VARIANT_ID, created.getVariantId()),
                () -> assertEquals(WAREHOUSE_ID, created.getWarehouseId()),
                () -> assertEquals("AVAILABLE", created.getStatus()),
                () -> assertNotNull(created.getImportedAt()),
                () -> assertEquals("POSTED", stocktake.getStatus()),
                () -> assertEquals("POSTED", result.getStatus())
        );
        verifyNoInteractions(inventoryDocumentService);
    }

    private static StocktakeRequest validRequest() {
        return StocktakeRequest.builder()
                .stocktakeCode("KK000001")
                .warehouseId(WAREHOUSE_ID)
                .purpose("Kiểm kê định kỳ")
                .stocktakeDate(LocalDate.of(2026, 8, 9))
                .conclusion("Khớp số liệu")
                .createdBy(CREATOR_ID)
                .lines(new ArrayList<>(List.of(StocktakeLineRequest.builder()
                        .variantId(VARIANT_ID)
                        .bookQty(new BigDecimal("10.00"))
                        .countQty(new BigDecimal("9.00"))
                        .diffQty(new BigDecimal("-1.00"))
                        .goodQty(new BigDecimal("9.00"))
                        .badQty(BigDecimal.ZERO)
                        .lostQty(new BigDecimal("1.00"))
                        .action("ADJUST")
                        .serials(new ArrayList<>())
                        .build())))
                .participants(new ArrayList<>())
                .build();
    }

    private static Stocktake stocktake(String code, String status) {
        return Stocktake.builder()
                .id(STOCKTAKE_ID)
                .stocktakeCode(code)
                .warehouseId(WAREHOUSE_ID)
                .purpose("Kiểm kê định kỳ")
                .stocktakeDate(LocalDate.of(2026, 8, 9))
                .status(status)
                .createdBy(CREATOR_ID)
                .build();
    }

    private static StocktakeLine stocktakeLine(Stocktake stocktake) {
        return StocktakeLine.builder()
                .id(101L)
                .stocktake(stocktake)
                .variantId(VARIANT_ID)
                .bookQty(new BigDecimal("10.00"))
                .countQty(new BigDecimal("9.00"))
                .diffQty(new BigDecimal("-1.00"))
                .goodQty(new BigDecimal("9.00"))
                .badQty(BigDecimal.ZERO)
                .lostQty(new BigDecimal("1.00"))
                .action("ADJUST")
                .build();
    }

    private static StocktakeLineSerial stocktakeSerial(
            StocktakeLine line,
            Long serialNumberId,
            String serialNumber,
            String scanStatus
    ) {
        return StocktakeLineSerial.builder()
                .stocktakeLine(line)
                .serialNumberId(serialNumberId)
                .serialNumber(serialNumber)
                .scanStatus(scanStatus)
                .build();
    }

    private static SerialNumber serial(Long id, String number, String status, Long warehouseId) {
        return SerialNumber.builder()
                .id(id)
                .variantId(VARIANT_ID)
                .warehouseId(warehouseId)
                .serialNumber(number)
                .status(status)
                .build();
    }

    private static Stocktake withId(Stocktake stocktake, Long id) {
        stocktake.setId(id);
        return stocktake;
    }
}
