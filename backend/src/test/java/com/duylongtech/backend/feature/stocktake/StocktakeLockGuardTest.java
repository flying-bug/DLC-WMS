package com.duylongtech.backend.feature.stocktake;

import com.duylongtech.backend.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class StocktakeLockGuardTest {

    private static final long WAREHOUSE = 7L;

    private StocktakeRepository repository;
    private StocktakeLockGuard guard;

    @BeforeEach
    void setUp() {
        repository = mock(StocktakeRepository.class);
        guard = new StocktakeLockGuard(repository);
    }

    private void warehouseIsBeingCounted(long stocktakeId) {
        Stocktake st = new Stocktake();
        st.initOrder("KK000001", WAREHOUSE, "p", null, 1L);
        st.setId(stocktakeId);
        st.startCounting(2L);
        when(repository.findFirstByWarehouseIdAndStatus(WAREHOUSE, "COUNTING")).thenReturn(Optional.of(st));
    }

    @Test
    void warehouseWithoutACountingStocktakeIsOpen() {
        when(repository.findFirstByWarehouseIdAndStatus(WAREHOUSE, "COUNTING")).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> guard.assertWarehouseNotLocked(WAREHOUSE, "SALES_ORDER", 5L));
        assertDoesNotThrow(() -> guard.assertWarehouseNotLocked(null, null, null));
    }

    @Test
    void countingWarehouseRejectsOrdinaryMovements() {
        warehouseIsBeingCounted(100L);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> guard.assertWarehouseNotLocked(WAREHOUSE, "SALES_ORDER", 5L));
        org.junit.jupiter.api.Assertions.assertTrue(ex.getMessage().contains("KK000001"));
        assertThrows(BusinessException.class, () -> guard.assertWarehouseNotLocked(WAREHOUSE, null, null));
        assertThrows(BusinessException.class, () -> guard.assertWarehouseNotLocked(WAREHOUSE));
    }

    @Test
    void onlyTheAdjustmentSlipsOfTheSameStocktakeMayBePostedWhileLocked() {
        warehouseIsBeingCounted(100L);

        assertDoesNotThrow(() -> guard.assertWarehouseNotLocked(WAREHOUSE, "STOCKTAKE", 100L));
        assertThrows(BusinessException.class, () -> guard.assertWarehouseNotLocked(WAREHOUSE, "STOCKTAKE", 999L));
        assertThrows(BusinessException.class, () -> guard.assertWarehouseNotLocked(WAREHOUSE, "PURCHASE_ORDER", 100L));
    }

    @Test
    void otherWarehousesAreNotAffected() {
        warehouseIsBeingCounted(100L);
        when(repository.findFirstByWarehouseIdAndStatus(8L, "COUNTING")).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> guard.assertWarehouseNotLocked(8L, "SALES_ORDER", 5L));
    }
}
