package com.duylongtech.backend.feature.system;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Mã chứng từ mới (đơn mua/bán, kiểm kê, chuyển kho) chỉ được cấp khi LƯU. Trước đây mở màn tạo mới đã lấy luôn một số
 * từ bộ đếm (/next-code gọi generateCode) nên mở form rồi bỏ không lưu là mã bị nhảy.
 */
class CodeGeneratorServiceNewCodeTest {

    private static final String KEY = "purchase_orders.po_code.PO";
    private static final Function<String, RuntimeException> DUPLICATE =
            code -> new BusinessException("Mã đơn hàng '" + code + "' đã tồn tại");

    private CodeSequenceAllocator allocator;
    private CodeGeneratorService service;

    @BeforeEach
    void setUp() {
        allocator = mock(CodeSequenceAllocator.class);
        service = new CodeGeneratorService(allocator);
    }

    @Test
    void openingTheCreateFormOnlyPreviewsTheCodeAndNeverTakesANumber() {
        when(allocator.previewNextValue(KEY, "purchase_orders", "po_code", "PO")).thenReturn(5L);

        assertEquals("PO0005", service.previewNewCode("purchase_orders", "po_code", "PO", 4, code -> false));
        assertEquals("PO0005", service.previewNewCode("purchase_orders", "po_code", "PO", 4, code -> false),
                "mở form lần hai (không lưu lần nào) vẫn thấy đúng mã đó");
        verify(allocator, never()).nextValue(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void previewSkipsCodesAlreadyTakenByHandTypedDocuments() {
        when(allocator.previewNextValue(KEY, "purchase_orders", "po_code", "PO")).thenReturn(5L);
        Set<String> taken = Set.of("PO0005", "PO0006");

        assertEquals("PO0007", service.previewNewCode("purchase_orders", "po_code", "PO", 4, taken::contains));
    }

    @Test
    void savingWithTheSuggestedCodeTakesTheNextNumberAtSaveTime() {
        // Form giữ nguyên mã gợi ý -> frontend không gửi mã -> backend cấp số lúc lưu
        when(allocator.nextValue(KEY, "purchase_orders", "po_code", "PO")).thenReturn(5L);

        assertEquals("PO0005", service.resolveNewCode("purchase_orders", "po_code", "PO", 4, null, code -> false, DUPLICATE));
        assertEquals("PO0005", service.resolveNewCode("purchase_orders", "po_code", "PO", 4, "  ", code -> false, DUPLICATE));
    }

    @Test
    void twoPeopleSavingFromTheSameSuggestionGetDifferentCodes() {
        // Cả hai cùng thấy PO0005; bộ đếm cấp nguyên tử nên người lưu sau nhận PO0006 thay vì lỗi trùng mã
        when(allocator.nextValue(KEY, "purchase_orders", "po_code", "PO")).thenReturn(5L, 6L);

        assertEquals("PO0005", service.resolveNewCode("purchase_orders", "po_code", "PO", 4, null, code -> false, DUPLICATE));
        assertEquals("PO0006", service.resolveNewCode("purchase_orders", "po_code", "PO", 4, null, "PO0005"::equals, DUPLICATE));
    }

    @Test
    void numbersAlreadyUsedByHandTypedCodesAreSkipped() {
        when(allocator.nextValue(KEY, "purchase_orders", "po_code", "PO")).thenReturn(5L, 6L, 7L);
        Set<String> taken = Set.of("PO0005", "PO0006");

        assertEquals("PO0007", service.resolveNewCode("purchase_orders", "po_code", "PO", 4, null, taken::contains, DUPLICATE));
    }

    @Test
    void aHandTypedCodeIsKeptAndPushesTheCounterPastIt() {
        assertEquals("PO0100", service.resolveNewCode("purchase_orders", "po_code", "PO", 4, " PO0100 ", code -> false, DUPLICATE));

        verify(allocator).syncSequence(KEY, "purchase_orders", "po_code", "PO", 100L);
        verify(allocator, never()).nextValue(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void aHandTypedCodeThatIsAlreadyUsedIsRejectedWithoutTouchingTheCounter() {
        BusinessException error = assertThrows(BusinessException.class, () -> service.resolveNewCode(
                "purchase_orders", "po_code", "PO", 4, "PO0003", "PO0003"::equals, DUPLICATE));

        assertEquals("Mã đơn hàng 'PO0003' đã tồn tại", error.getMessage());
        verify(allocator, never()).syncSequence(anyString(), anyString(), anyString(), anyString(), anyLong());
    }

    @Test
    void givesUpWithAClearErrorIfEveryNumberIsTaken() {
        when(allocator.nextValue(KEY, "purchase_orders", "po_code", "PO")).thenReturn(5L);

        BusinessException error = assertThrows(BusinessException.class, () -> service.resolveNewCode(
                "purchase_orders", "po_code", "PO", 4, null, code -> true, DUPLICATE));

        assertEquals(SystemMessage.CODE_ERR_001.getMessage(), error.getMessage());
    }
}
