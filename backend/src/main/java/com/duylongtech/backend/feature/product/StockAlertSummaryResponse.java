package com.duylongtech.backend.feature.product;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockAlertSummaryResponse {
    /** Số mã hàng (biến thể) sắp hết: có cài "Tồn tối thiểu" và tồn bán được từ 1 tới mức đó. */
    private Integer lowStockCount;
    /** Số mã hàng (biến thể) không còn tồn bán được. */
    private Integer outOfStockCount;
    /** Sản phẩm có ít nhất một mã hàng sắp hết / hết hàng - màn Vật tư hàng hóa lọc theo danh sách này. */
    private List<Long> lowStockProductIds;
    private List<Long> outOfStockProductIds;
    /** Các mã hàng sắp hết, tồn ít nhất lên trước - màn Tổng quan hiển thị danh sách này. */
    private List<StockAlertItem> lowStockItems;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockAlertItem {
        private Long productId;
        private Long variantId;
        private String sku;
        private String productName;
        private String productType;
        private String unitName;
        private BigDecimal stockQty;
        private BigDecimal minStockQty;
    }
}
