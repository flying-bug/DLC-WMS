package com.duylongtech.backend.feature.inventory;

import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.stocktake.Stocktake;
import com.duylongtech.backend.feature.stocktake.StocktakeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Mỗi lần kiểm kê chỉ có một phiếu nhập và một phiếu xuất điều chỉnh còn hiệu lực. Trước đây ghi sổ phiếu nhập điều
 * chỉnh xong, quay lại trang kiểm kê vẫn bấm "Lập phiếu nhập" được (hoặc chọn lại kiểm kê đã vào sổ trong hộp "Tham
 * chiếu") -> tồn kho được cộng thêm lần nữa.
 */
class StocktakeAdjustmentGuardTest {

    private static final long STOCKTAKE_ID = 12L;

    private InventoryDocumentRepository documents;
    private StocktakeRepository stocktakes;
    private StocktakeAdjustmentGuard guard;

    @BeforeEach
    void setUp() {
        documents = mock(InventoryDocumentRepository.class);
        stocktakes = mock(StocktakeRepository.class);
        guard = new StocktakeAdjustmentGuard(documents, stocktakes);
        when(documents.findByReferenceTypeInAndReferenceIdAndDocTypeOrderByIdDesc(any(), anyLong(), anyString()))
                .thenReturn(List.of());
    }

    private Stocktake stocktake(String status, Long linkedImportId) {
        Stocktake stocktake = mock(Stocktake.class);
        when(stocktake.getId()).thenReturn(STOCKTAKE_ID);
        when(stocktake.getStocktakeCode()).thenReturn("KK000012");
        when(stocktake.getStatus()).thenReturn(status);
        when(stocktake.isEditable()).thenReturn("DRAFT".equals(status) || "COUNTING".equals(status));
        when(stocktake.getReferenceImportId()).thenReturn(linkedImportId);
        when(stocktakes.findById(STOCKTAKE_ID)).thenReturn(Optional.of(stocktake));
        return stocktake;
    }

    private static InventoryDocument importDoc(long id, String code, String status) {
        InventoryDocument doc = mock(InventoryDocument.class);
        when(doc.getId()).thenReturn(id);
        when(doc.getDocCode()).thenReturn(code);
        when(doc.getStatus()).thenReturn(status);
        when(doc.getDocType()).thenReturn("IN_PO");
        when(doc.getReferenceType()).thenReturn("STOCKTAKE");
        when(doc.getReferenceId()).thenReturn(STOCKTAKE_ID);
        return doc;
    }

    private void existingImports(InventoryDocument... docs) {
        when(documents.findByReferenceTypeInAndReferenceIdAndDocTypeOrderByIdDesc(any(), anyLong(), anyString()))
                .thenReturn(List.of(docs));
    }

    @Test
    void theFirstAdjustmentOfAStocktakeInProgressIsAllowed() {
        stocktake("COUNTING", null);

        assertDoesNotThrow(() -> guard.assertCanCreate("STOCKTAKE", STOCKTAKE_ID, "IN_PO", null));
    }

    @Test
    void aSecondImportAdjustmentIsRejectedAndPointsToTheExistingOne() {
        stocktake("COUNTING", 50L);
        existingImports(importDoc(50, "NK00050", "POSTED"));

        BusinessException error = assertThrows(BusinessException.class,
                () -> guard.assertCanCreate("STOCKTAKE", STOCKTAKE_ID, "IN_PO", null));

        assertTrue(error.getMessage().contains("KK000012") && error.getMessage().contains("NK00050")
                && error.getMessage().contains("đã ghi sổ"), error.getMessage());
    }

    @Test
    void aDraftAdjustmentAlsoBlocksCreatingAnotherOne() {
        stocktake("COUNTING", 50L);
        existingImports(importDoc(50, "NK00050", "DRAFT"));

        assertThrows(BusinessException.class, () -> guard.assertCanCreate("STOCKTAKE", STOCKTAKE_ID, "IN_PO", null));
    }

    @Test
    void aNewAdjustmentIsAllowedOnceThePreviousOneWasCancelled() {
        stocktake("COUNTING", 50L);
        existingImports(importDoc(50, "NK00050", "CANCELLED"));

        assertDoesNotThrow(() -> guard.assertCanCreate("STOCKTAKE", STOCKTAKE_ID, "IN_PO", null));
    }

    @Test
    void aFinishedOrCancelledStocktakeTakesNoMoreAdjustments() {
        stocktake("POSTED", null);
        BusinessException posted = assertThrows(BusinessException.class,
                () -> guard.assertCanCreate("STOCKTAKE", STOCKTAKE_ID, "IN_PO", null));
        assertTrue(posted.getMessage().contains("Đã vào sổ"), posted.getMessage());

        stocktake("CANCELLED", null);
        assertThrows(BusinessException.class, () -> guard.assertCanCreate("STOCKTAKE", STOCKTAKE_ID, "EX_SO", null));
    }

    @Test
    void documentsThatDoNotReferenceAStocktakeAreNotChecked() {
        guard.assertCanCreate("PURCHASE_ORDER", 5L, "IN_PO", null);
        guard.assertCanCreate(null, null, "EX_SO", null);

        verifyNoInteractions(stocktakes);
    }

    @Test
    void postingASecondAdjustmentIsRejectedWhenOneIsAlreadyPosted() {
        // Phiếu trùng lập từ trước khi có kiểm tra: không cho ghi sổ thêm
        stocktake("COUNTING", 60L);
        InventoryDocument duplicate = importDoc(60, "NK00060", "DRAFT");
        existingImports(duplicate, importDoc(50, "NK00050", "POSTED"));

        BusinessException error = assertThrows(BusinessException.class, () -> guard.assertCanPost(duplicate));
        assertTrue(error.getMessage().contains("NK00050"), error.getMessage());
    }

    @Test
    void postingAnUnlinkedAdjustmentAfterTheStocktakeIsPostedIsRejected() {
        stocktake("POSTED", 50L);
        InventoryDocument stray = importDoc(70, "NK00070", "DRAFT");
        existingImports(stray);

        assertThrows(BusinessException.class, () -> guard.assertCanPost(stray));
    }

    @Test
    void theStocktakesOwnAdjustmentCanBeRePostedAfterAnUnpost() {
        stocktake("POSTED", 50L);
        InventoryDocument own = importDoc(50, "NK00050", "UNPOSTED");
        existingImports(own);

        assertDoesNotThrow(() -> guard.assertCanPost(own));
    }

    @Test
    void completionNeedsAPostedAdjustmentNotJustADraft() {
        existingImports(importDoc(50, "NK00050", "DRAFT"));
        assertFalse(guard.hasPostedAdjustment(STOCKTAKE_ID, "IN_PO"));

        existingImports(importDoc(50, "NK00050", "POSTED"));
        assertTrue(guard.hasPostedAdjustment(STOCKTAKE_ID, "IN_PO"));
    }
}
