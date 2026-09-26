package com.duylongtech.backend.feature.product;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Quy tắc cảnh báo tồn dùng chung cho màn Tổng quan và Vật tư hàng hóa. Trước đây Tổng quan đếm mọi mã có cài
 * ngưỡng (kể cả còn nhiều hàng), còn Vật tư hàng hóa dùng ngưỡng cứng 5 và bỏ qua "Tồn tối thiểu" nên hai màn lệch nhau.
 */
class StockAlertRuleTest {

    private static BigDecimal qty(String value) {
        return new BigDecimal(value);
    }

    @Test
    void lowStockNeedsAConfiguredMinimumAndStockBetweenOneAndThatMinimum() {
        assertTrue(ProductService.isLowStock(qty("3"), qty("5")));
        assertTrue(ProductService.isLowStock(qty("5"), qty("5")));
        assertFalse(ProductService.isLowStock(qty("6"), qty("5")), "còn nhiều hơn mức tối thiểu");
        assertFalse(ProductService.isLowStock(qty("3"), BigDecimal.ZERO), "chưa cài Tồn tối thiểu thì không cảnh báo");
        assertFalse(ProductService.isLowStock(qty("3"), null));
        assertFalse(ProductService.isLowStock(BigDecimal.ZERO, qty("5")), "hết hàng tính riêng, không tính là sắp hết");
    }

    @Test
    void outOfStockMeansNothingLeftToSell() {
        assertTrue(ProductService.isOutOfStock(BigDecimal.ZERO));
        assertTrue(ProductService.isOutOfStock(qty("-1")));
        assertTrue(ProductService.isOutOfStock(null));
        assertFalse(ProductService.isOutOfStock(qty("1")));
    }
}
