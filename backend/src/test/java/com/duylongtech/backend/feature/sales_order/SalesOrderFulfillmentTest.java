package com.duylongtech.backend.feature.sales_order;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SalesOrderFulfillmentTest {

    private static final long WH_A = 1L;
    private static final long WH_B = 2L;
    private static final long PRODUCT_X = 10L;
    private static final long PRODUCT_Y = 11L;

    private static SalesOrderLine line(long variantId, int quantity, Long warehouseId) {
        SalesOrderLine line = new SalesOrderLine();
        line.initLine(variantId, BigDecimal.valueOf(quantity), BigDecimal.ONE, BigDecimal.ZERO, warehouseId, null, null);
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
        SalesOrderLine lineA = line(PRODUCT_X, 5, WH_A);
        SalesOrderLine lineB = line(PRODUCT_X, 3, WH_B);
        SalesOrderFulfillment fulfillment = SalesOrderFulfillment.of(List.of(lineA, lineB), WH_A,
                List.<Object[]>of(row(PRODUCT_X, WH_A, "POSTED", 5)));

        assertTrue(fulfillment.isMultiWarehouse());
        assertEquals(0, fulfillment.forLine(lineA).remainingToAllocate().signum());
        assertEquals(0, qty(3).compareTo(fulfillment.forLine(lineB).remainingToAllocate()),
                "kho B chưa xuất gì nên vẫn còn đủ 3");
        assertFalse(fulfillment.isFullyPosted(), "kho B chưa giao nên SO chưa xuất đủ");
    }

    @Test
    void draftExportReservesQuantityButDoesNotCompleteTheSo() {
        SalesOrderLine lineA = line(PRODUCT_X, 5, WH_A);
        SalesOrderLine lineB = line(PRODUCT_Y, 3, WH_B);
        SalesOrderFulfillment fulfillment = SalesOrderFulfillment.of(List.of(lineA, lineB), WH_A, List.<Object[]>of(
                row(PRODUCT_X, WH_A, "POSTED", 5),
                row(PRODUCT_Y, WH_B, "DRAFT", 3)));

        assertEquals(0, fulfillment.forLine(lineB).remainingToAllocate().signum(), "đã có phiếu nháp giữ chỗ");
        assertEquals(0, fulfillment.forLine(lineB).getPosted().signum(), "nháp chưa tính là đã giao");
        assertFalse(fulfillment.isFullyPosted(), "phiếu nháp kho B chưa ghi sổ");
    }

    @Test
    void soCompletesOnlyWhenEveryWarehouseIsPosted() {
        SalesOrderLine lineA = line(PRODUCT_X, 5, WH_A);
        SalesOrderLine lineB = line(PRODUCT_Y, 3, WH_B);
        SalesOrderFulfillment fulfillment = SalesOrderFulfillment.of(List.of(lineA, lineB), WH_A, List.<Object[]>of(
                row(PRODUCT_X, WH_A, "POSTED", 5),
                row(PRODUCT_Y, WH_B, "POSTED", 3)));

        assertTrue(fulfillment.isFullyPosted());
    }

    @Test
    void partialExportKeepsRemainderForTheSameWarehouse() {
        SalesOrderLine lineA = line(PRODUCT_X, 5, WH_A);
        SalesOrderLine lineB = line(PRODUCT_Y, 3, WH_B);
        SalesOrderFulfillment fulfillment = SalesOrderFulfillment.of(List.of(lineA, lineB), WH_A,
                List.<Object[]>of(row(PRODUCT_X, WH_A, "POSTED", 2)));

        assertEquals(0, qty(3).compareTo(fulfillment.forLine(lineA).remainingToAllocate()));
        assertFalse(fulfillment.isFullyPosted());
    }

    @Test
    void lineWithoutWarehouseFallsBackToTheOrderHeaderWarehouse() {
        SalesOrderLine lineA = line(PRODUCT_X, 5, null);
        SalesOrderLine lineB = line(PRODUCT_Y, 3, WH_B);
        SalesOrderFulfillment fulfillment = SalesOrderFulfillment.of(List.of(lineA, lineB), WH_A, List.<Object[]>of(
                row(PRODUCT_X, WH_A, "POSTED", 5)));

        assertTrue(fulfillment.isMultiWarehouse(), "dòng không chọn kho lấy kho đầu đơn nên vẫn là 2 kho");
        assertEquals(0, fulfillment.forLine(lineA).remainingToAllocate().signum());
        assertEquals(0, qty(3).compareTo(fulfillment.forLine(lineB).remainingToAllocate()));
    }

    @Test
    void singleWarehouseSoIsTrackedByProductRegardlessOfExportWarehouse() {
        SalesOrderLine only = line(PRODUCT_X, 10, WH_A);
        SalesOrderFulfillment fulfillment = SalesOrderFulfillment.of(List.of(only), WH_A, List.<Object[]>of(
                row(PRODUCT_X, WH_B, "POSTED", 4),
                row(PRODUCT_X, WH_A, "POSTED", 6)));

        assertFalse(fulfillment.isMultiWarehouse());
        assertTrue(fulfillment.isFullyPosted());
    }

    @Test
    void exportForProductNotOnTheSoIsIgnored() {
        SalesOrderLine only = line(PRODUCT_X, 10, WH_A);
        SalesOrderFulfillment fulfillment = SalesOrderFulfillment.of(List.of(only), WH_A,
                List.<Object[]>of(row(PRODUCT_Y, WH_A, "POSTED", 99)));

        assertNull(fulfillment.forVariant(PRODUCT_Y, WH_A));
        assertFalse(fulfillment.isFullyPosted());
    }
}
