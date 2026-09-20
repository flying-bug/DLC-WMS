package com.duylongtech.backend.feature.purchase_order;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PurchaseOrderReceivingTest {

    private static final long WH_A = 1L;
    private static final long WH_B = 2L;
    private static final long PRODUCT_X = 10L;
    private static final long PRODUCT_Y = 11L;

    private static PurchaseOrderLine line(long variantId, int quantity, Long warehouseId) {
        PurchaseOrderLine line = new PurchaseOrderLine();
        line.initLine(variantId, BigDecimal.valueOf(quantity), BigDecimal.ONE, BigDecimal.ZERO, warehouseId, null);
        return line;
    }

    private static Object[] row(long variantId, Long warehouseId, String status, int quantity) {
        return new Object[] { variantId, warehouseId, status, BigDecimal.valueOf(quantity) };
    }

    private static BigDecimal qty(int value) {
        return BigDecimal.valueOf(value);
    }

    @Test
    void sameProductInTwoWarehousesIsTrackedSeparately() {
        PurchaseOrderLine lineA = line(PRODUCT_X, 60, WH_A);
        PurchaseOrderLine lineB = line(PRODUCT_X, 40, WH_B);
        PurchaseOrderReceiving receiving = PurchaseOrderReceiving.of(List.of(lineA, lineB),
                List.<Object[]>of(row(PRODUCT_X, WH_A, "POSTED", 60)));

        assertTrue(receiving.isMultiWarehouse());
        assertEquals(0, receiving.forLine(lineA).remainingToAllocate().signum());
        assertEquals(0, qty(40).compareTo(receiving.forLine(lineB).remainingToAllocate()));
        assertFalse(receiving.isFullyPosted(), "kho B chưa nhận nên PO chưa hoàn thành");
    }

    @Test
    void draftReceiptReservesQuantityButDoesNotCompleteThePo() {
        PurchaseOrderLine lineA = line(PRODUCT_X, 60, WH_A);
        PurchaseOrderLine lineB = line(PRODUCT_Y, 40, WH_B);
        PurchaseOrderReceiving receiving = PurchaseOrderReceiving.of(List.of(lineA, lineB), List.<Object[]>of(
                row(PRODUCT_X, WH_A, "POSTED", 60),
                row(PRODUCT_Y, WH_B, "DRAFT", 40)));

        assertEquals(0, receiving.forLine(lineB).remainingToAllocate().signum(), "đã có phiếu nháp giữ chỗ");
        assertFalse(receiving.isFullyPosted(), "phiếu nháp kho B chưa ghi sổ");
    }

    @Test
    void poCompletesOnlyWhenEveryWarehouseIsPosted() {
        PurchaseOrderLine lineA = line(PRODUCT_X, 60, WH_A);
        PurchaseOrderLine lineB = line(PRODUCT_Y, 40, WH_B);
        PurchaseOrderReceiving receiving = PurchaseOrderReceiving.of(List.of(lineA, lineB), List.<Object[]>of(
                row(PRODUCT_X, WH_A, "POSTED", 60),
                row(PRODUCT_Y, WH_B, "POSTED", 40)));

        assertTrue(receiving.isFullyPosted());
    }

    @Test
    void underReceiptKeepsRemainderForTheSameWarehouse() {
        PurchaseOrderLine lineA = line(PRODUCT_X, 60, WH_A);
        PurchaseOrderLine lineB = line(PRODUCT_Y, 40, WH_B);
        PurchaseOrderReceiving receiving = PurchaseOrderReceiving.of(List.of(lineA, lineB),
                List.<Object[]>of(row(PRODUCT_X, WH_A, "POSTED", 50)));

        assertEquals(0, qty(10).compareTo(receiving.forLine(lineA).remainingToAllocate()));
        assertFalse(receiving.isFullyPosted());
    }

    @Test
    void singleWarehousePoIsTrackedByProductRegardlessOfReceiptWarehouse() {
        PurchaseOrderLine only = line(PRODUCT_X, 100, WH_A);
        PurchaseOrderReceiving receiving = PurchaseOrderReceiving.of(List.of(only), List.<Object[]>of(
                row(PRODUCT_X, WH_B, "POSTED", 40),
                row(PRODUCT_X, WH_A, "POSTED", 60)));

        assertFalse(receiving.isMultiWarehouse());
        assertTrue(receiving.isFullyPosted());
    }

    @Test
    void receiptForProductNotOnThePoIsIgnored() {
        PurchaseOrderLine only = line(PRODUCT_X, 10, WH_A);
        PurchaseOrderReceiving receiving = PurchaseOrderReceiving.of(List.of(only),
                List.<Object[]>of(row(PRODUCT_Y, WH_A, "POSTED", 99)));

        assertNull(receiving.forVariant(PRODUCT_Y, WH_A));
        assertFalse(receiving.isFullyPosted());
    }
}
