package com.duylongtech.backend.feature.stocktake;

import com.duylongtech.backend.enums.StocktakeStatus;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.inventory.InventoryBalance;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentService;
import com.duylongtech.backend.feature.notification.AppNotificationService;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.SerialNumberRepository;
import com.duylongtech.backend.feature.system.CodeGeneratorService;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import com.duylongtech.backend.security.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class StocktakeApprovalFlowTest {

    private static final long WAREHOUSE = 7L;

    private StocktakeRepository stocktakeRepository;
    private InventoryBalanceRepository balanceRepository;
    private AppNotificationService notifications;
    private InventoryDocumentRepository documentRepository;
    private StocktakeService service;

    private static UserDetailsImpl user(long id, String... authorities) {
        return new UserDetailsImpl(id, "u" + id, "x", true,
                java.util.Arrays.stream(authorities).map(SimpleGrantedAuthority::new).toList());
    }

    private final UserDetailsImpl accountant = user(1, "ROLE_ACCOUNTANT", "stocktake:add");
    private final UserDetailsImpl manager = user(2, "ROLE_MANAGER");
    private final UserDetailsImpl keeper = user(3, "ROLE_WAREHOUSE_CONTROLLER", "stocktake:edit");

    @BeforeEach
    void setUp() {
        stocktakeRepository = mock(StocktakeRepository.class);
        balanceRepository = mock(InventoryBalanceRepository.class);
        notifications = mock(AppNotificationService.class);
        documentRepository = mock(InventoryDocumentRepository.class);
        StocktakeMapper mapper = mock(StocktakeMapper.class);
        when(mapper.toResponse(any())).thenAnswer(inv -> StocktakeResponse.builder()
                .status(((Stocktake) inv.getArgument(0)).getStatus()).build());
        when(mapper.toLineResponse(any())).thenAnswer(inv -> new StocktakeLineResponse());
        CodeGeneratorService codes = mock(CodeGeneratorService.class);
        when(codes.generateCode(anyString(), anyString(), anyString(), org.mockito.ArgumentMatchers.anyInt())).thenReturn("KK000001");
        when(stocktakeRepository.save(any(Stocktake.class))).thenAnswer(inv -> {
            Stocktake st = inv.getArgument(0);
            if (st.getId() == null) st.setId(100L);
            return st;
        });
        when(balanceRepository.findByWarehouseAndVariantForUpdate(anyLong(), anyLong(), anyString()))
                .thenReturn(Optional.empty());

        service = new StocktakeService(stocktakeRepository, balanceRepository, mapper, codes,
                mock(ProductVariantRepository.class), mock(WarehouseRepository.class),
                mock(InventoryDocumentService.class), mock(SerialNumberRepository.class),
                mock(UserRepository.class), notifications, documentRepository);
    }

    private static StocktakeRequest request() {
        StocktakeLineRequest line = new StocktakeLineRequest();
        line.setVariantId(11L);
        line.setBookQty(new BigDecimal("10"));
        line.setCountQty(new BigDecimal("10"));
        line.setGoodQty(new BigDecimal("10"));
        StocktakeRequest req = new StocktakeRequest();
        req.setWarehouseId(WAREHOUSE);
        req.setCreatedBy(1L);
        req.setLines(List.of(line));
        return req;
    }

    private Stocktake pendingStocktake() {
        Stocktake st = new Stocktake();
        st.initOrder("KK000001", WAREHOUSE, "p", null, 1L);
        st.setId(100L);
        st.addLine(lineWithBook(10, 10));
        st.submitForApproval();
        when(stocktakeRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(st));
        return st;
    }

    private static StocktakeLine lineWithBook(int book, int count) {
        StocktakeLine line = new StocktakeLine();
        line.initLine(11L, BigDecimal.valueOf(book), BigDecimal.valueOf(count), BigDecimal.valueOf(count), null, null, null);
        return line;
    }

    // ---------------- tạo phiếu ----------------

    @Test
    void accountantRequestWaitsForApprovalAndNotifiesManagersWithoutLockingTheWarehouse() {
        StocktakeResponse response = service.createStocktake(request(), accountant);

        assertEquals("PENDING_APPROVAL", response.getStatus());
        verify(notifications).createNotification(eq("ROLE_MANAGER"), any(), anyString(), anyString(),
                eq("STOCKTAKE_APPROVAL"), eq("STOCKTAKE"), eq(100L), anyString(), any());
    }

    @Test
    void managerCreatingStartsCountingImmediately() {
        when(balanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE, 11L, "GOOD"))
                .thenReturn(Optional.of(balance("12")));

        StocktakeResponse response = service.createStocktake(request(), manager);

        assertEquals("COUNTING", response.getStatus());
        verify(notifications, never()).createNotification(eq("ROLE_MANAGER"), any(), anyString(), anyString(),
                eq("STOCKTAKE_APPROVAL"), anyString(), anyLong(), anyString(), any());
    }

    @Test
    void warehouseWithAnOpenStocktakeCannotStartAnother() {
        when(stocktakeRepository.existsByWarehouseIdAndStatusIn(eq(WAREHOUSE), any())).thenReturn(true);

        assertThrows(BusinessException.class, () -> service.createStocktake(request(), accountant));
        verify(stocktakeRepository, never()).save(any(Stocktake.class));
    }

    // ---------------- duyệt / từ chối ----------------

    @Test
    void approvingLocksTheWarehouseAndFreezesBookQuantityAtCurrentStock() {
        Stocktake st = pendingStocktake();
        when(balanceRepository.findByWarehouseAndVariantForUpdate(WAREHOUSE, 11L, "GOOD"))
                .thenReturn(Optional.of(balance("12")));

        service.approveStocktake(100L, manager);

        assertEquals("COUNTING", st.getStatus());
        assertEquals(2L, st.getApprovedBy());
        StocktakeLine line = st.getLines().get(0);
        assertEquals(0, new BigDecimal("12").compareTo(line.getBookQty()), "số sổ sách chốt theo tồn lúc duyệt");
        assertEquals(0, new BigDecimal("12").compareTo(line.getCountQty()), "số đếm điền sẵn đi theo số sổ sách, không sinh chênh lệch giả");
        assertEquals(0, BigDecimal.ZERO.compareTo(line.getDiffQty()));
        verify(notifications).retypeNotifications("STOCKTAKE", 100L, "STOCKTAKE_APPROVAL", "STOCKTAKE_DECIDED");
    }

    @Test
    void countedQuantityTheUserAlreadyChangedIsKeptWhenBookQuantityIsRefrozen() {
        StocktakeLine line = lineWithBook(10, 8);

        line.rebaseBookQty(new BigDecimal("12"));

        assertEquals(0, new BigDecimal("8").compareTo(line.getCountQty()));
        assertEquals(0, new BigDecimal("-4").compareTo(line.getDiffQty()));
    }

    @Test
    void onlyManagersCanApproveOrReject() {
        pendingStocktake();

        assertThrows(BusinessException.class, () -> service.approveStocktake(100L, accountant));
        assertThrows(BusinessException.class, () -> service.approveStocktake(100L, keeper));
        assertThrows(BusinessException.class, () -> service.rejectStocktake(100L, "lý do", accountant));
    }

    @Test
    void approvingTwiceIsRejectedInsteadOfLockingAgain() {
        pendingStocktake();
        service.approveStocktake(100L, manager);

        assertThrows(BusinessException.class, () -> service.approveStocktake(100L, manager));
    }

    @Test
    void rejectingNeedsAReasonAndDoesNotLockTheWarehouse() {
        Stocktake st = pendingStocktake();

        assertThrows(BusinessException.class, () -> service.rejectStocktake(100L, "  ", manager));

        service.rejectStocktake(100L, "Chưa đến kỳ kiểm kê", manager);
        assertEquals("REJECTED", st.getStatus());
        assertEquals("Chưa đến kỳ kiểm kê", st.getRejectReason());
        assertTrue(!st.isCounting());
    }

    @Test
    void cannotApproveWhileAnotherStocktakeIsAlreadyCountingTheSameWarehouse() {
        pendingStocktake();
        Stocktake other = new Stocktake();
        other.initOrder("KK000000", WAREHOUSE, "p", null, 1L);
        other.setId(99L);
        other.startCounting(2L);
        when(stocktakeRepository.findFirstByWarehouseIdAndStatus(WAREHOUSE, StocktakeStatus.COUNTING.name()))
                .thenReturn(Optional.of(other));

        assertThrows(BusinessException.class, () -> service.approveStocktake(100L, manager));
    }

    // ---------------- hủy ----------------

    @Test
    void creatorMayCancelOwnPendingRequestButNotACountingOne() {
        Stocktake st = pendingStocktake();
        service.cancelStocktake(100L, accountant);
        assertEquals("CANCELLED", st.getStatus());

        Stocktake counting = new Stocktake();
        counting.initOrder("KK000002", WAREHOUSE, "p", null, 1L);
        counting.setId(101L);
        counting.startCounting(2L);
        when(stocktakeRepository.findByIdForUpdate(101L)).thenReturn(Optional.of(counting));

        assertThrows(BusinessException.class, () -> service.cancelStocktake(101L, accountant));
        service.cancelStocktake(101L, manager);
        assertEquals("CANCELLED", counting.getStatus());
        verify(notifications).createNotification(eq("ROLE_WAREHOUSE_CONTROLLER"), any(), anyString(), anyString(),
                anyString(), eq("STOCKTAKE"), eq(101L), anyString(), eq(WAREHOUSE));
    }

    // ---------------- nhập số đếm / hoàn thành ----------------

    @Test
    void countsCannotBeEditedUntilTheManagerApproves() {
        pendingStocktake();

        assertThrows(BusinessException.class, () -> service.updateStocktake(100L, request(), keeper));
    }

    @Test
    void bookQuantityStaysFrozenWhenTheKeeperSavesCounts() {
        Stocktake st = new Stocktake();
        st.initOrder("KK000001", WAREHOUSE, "p", null, 1L);
        st.setId(100L);
        st.addLine(lineWithBook(12, 12));
        st.startCounting(2L);
        when(stocktakeRepository.findByIdWithDetails(100L)).thenReturn(Optional.of(st));
        StocktakeRequest req = request();
        req.getLines().get(0).setBookQty(new BigDecimal("999")); // client cố đổi số sổ sách
        req.getLines().get(0).setCountQty(new BigDecimal("11"));

        service.updateStocktake(100L, req, keeper);

        StocktakeLine line = st.getLines().get(0);
        assertEquals(0, new BigDecimal("12").compareTo(line.getBookQty()));
        assertEquals(0, new BigDecimal("-1").compareTo(line.getDiffQty()));
    }

    @Test
    void cannotFinishWithDifferencesUntilAdjustmentSlipsExist() {
        Stocktake st = new Stocktake();
        st.initOrder("KK000001", WAREHOUSE, "p", null, 1L);
        st.setId(100L);
        st.addLine(lineWithBook(12, 11));
        st.startCounting(2L);
        when(stocktakeRepository.findByIdWithDetails(100L)).thenReturn(Optional.of(st));

        assertThrows(BusinessException.class, () -> service.postStocktake(100L, keeper));

        st.setReferenceExportId(55L);
        InventoryDocument draftAdjustment = new InventoryDocument();
        draftAdjustment.updateStatus("DRAFT");
        when(documentRepository.findById(55L)).thenReturn(Optional.of(draftAdjustment));
        assertThrows(BusinessException.class, () -> service.postStocktake(100L, keeper), "phiếu điều chỉnh còn nháp chưa đủ");

        draftAdjustment.updateStatus("POSTED");
        service.postStocktake(100L, keeper);
        assertEquals("POSTED", st.getStatus());
        assertTrue(!st.isCounting(), "ghi sổ xong thì kho tự mở khóa");
    }

    // ---------------- Không xử lý chênh lệch ----------------

    private Stocktake countingWithSkippedLine(String reason) {
        Stocktake st = new Stocktake();
        st.initOrder("KK000001", WAREHOUSE, "p", null, 1L);
        st.setId(100L);
        StocktakeLine line = new StocktakeLine();
        line.initLine(11L, new BigDecimal("12"), new BigDecimal("11"), new BigDecimal("11"), null, null, "Không xử lý");
        line.updateSkipReason(reason);
        st.addLine(line);
        st.startCounting(2L);
        when(stocktakeRepository.findByIdWithDetails(100L)).thenReturn(Optional.of(st));
        when(stocktakeRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(st));
        return st;
    }

    @Test
    void skippedLineNeedsNoAdjustmentSlipButNeedsAReason() {
        Stocktake st = countingWithSkippedLine(null);

        assertTrue(!st.requiresExportAdjustment(), "dòng Không xử lý không cần phiếu xuất điều chỉnh");
        StocktakeRequest req = request();
        req.getLines().get(0).setCountQty(new BigDecimal("11"));
        req.getLines().get(0).setAction("Không xử lý");
        assertThrows(BusinessException.class, () -> service.updateStocktake(100L, req, keeper), "thiếu lý do");

        req.getLines().get(0).setSkipReason("Hao hụt trong định mức");
        service.updateStocktake(100L, req, keeper);
        assertEquals("Hao hụt trong định mức", st.getLines().get(0).getSkipReason());
    }

    @Test
    void skippedDifferencesMustBeConfirmedByManagerOrAccountantBeforeCompleting() {
        Stocktake st = countingWithSkippedLine("Hao hụt trong định mức");

        assertThrows(BusinessException.class, () -> service.postStocktake(100L, keeper), "chưa có ai xác nhận");
        assertThrows(BusinessException.class, () -> service.confirmWaivers(100L, keeper), "thủ kho không được tự xác nhận");
        assertEquals("COUNTING", st.getStatus());

        service.confirmWaivers(100L, accountant);

        assertEquals("POSTED", st.getStatus(), "không còn phiếu điều chỉnh nào chờ -> hoàn thành, kho mở khóa");
        assertEquals(1L, st.getWaiverConfirmedBy());
        assertEquals("Hao hụt trong định mức", st.getLines().get(0).getSkipReason(), "lý do vẫn được lưu để tra cứu");
    }

    @Test
    void confirmedWaiverIsInvalidatedWhenCountsAreEditedAgain() {
        Stocktake st = countingWithSkippedLine("Hao hụt trong định mức");
        st.getLines().add(lineWithBook(5, 3)); // thêm dòng lệch cần phiếu điều chỉnh -> chưa hoàn thành khi xác nhận
        service.confirmWaivers(100L, manager);
        assertEquals("COUNTING", st.getStatus(), "còn dòng thiếu chưa có phiếu xuất điều chỉnh");
        assertTrue(st.getWaiverConfirmedAt() != null);

        StocktakeRequest req = request();
        req.getLines().get(0).setCountQty(new BigDecimal("11"));
        req.getLines().get(0).setAction("Không xử lý");
        req.getLines().get(0).setSkipReason("Hao hụt trong định mức");
        service.updateStocktake(100L, req, keeper);

        assertEquals(null, st.getWaiverConfirmedAt(), "sửa số đếm thì phải xác nhận lại");
    }

    @Test
    void savingTheSameCountsAgainKeepsTheConfirmation() {
        Stocktake st = countingWithSkippedLine("Hao hụt trong định mức");
        StocktakeLine shortage = new StocktakeLine();
        shortage.initLine(12L, new BigDecimal("5"), new BigDecimal("3"), new BigDecimal("3"), null, null, "Xử lý chênh lệch");
        st.addLine(shortage);
        service.confirmWaivers(100L, manager);
        assertTrue(st.getWaiverConfirmedAt() != null);

        StocktakeLineRequest first = request().getLines().get(0);
        first.setCountQty(new BigDecimal("11"));
        first.setAction("Không xử lý");
        first.setSkipReason("Hao hụt trong định mức");
        StocktakeLineRequest second = new StocktakeLineRequest();
        second.setVariantId(12L);
        second.setCountQty(new BigDecimal("3"));
        second.setGoodQty(new BigDecimal("3"));
        second.setAction("Xử lý chênh lệch");
        StocktakeRequest req = request();
        req.setLines(List.of(first, second));

        service.updateStocktake(100L, req, keeper);

        assertTrue(st.getWaiverConfirmedAt() != null, "lưu lại y nguyên thì xác nhận vẫn còn");
    }

    @Test
    void requestingConfirmationNotifiesManagersAndAccountants() {
        countingWithSkippedLine("Hao hụt trong định mức");

        service.requestWaiverConfirmation(100L);

        verify(notifications).createNotification(eq("ROLE_MANAGER"), any(), anyString(), anyString(),
                eq("STOCKTAKE_WAIVER"), eq("STOCKTAKE"), eq(100L), anyString(), any());
        verify(notifications).createNotification(eq("ROLE_ACCOUNTANT"), any(), anyString(), anyString(),
                eq("STOCKTAKE_WAIVER"), eq("STOCKTAKE"), eq(100L), anyString(), any());
    }

    private static InventoryBalance balance(String onHand) {
        InventoryBalance b = new InventoryBalance();
        b.initBalance(WAREHOUSE, 11L, null, "GOOD", new BigDecimal(onHand), BigDecimal.ZERO, BigDecimal.ZERO);
        return b;
    }
}
