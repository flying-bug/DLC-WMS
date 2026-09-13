package com.duylongtech.backend.feature.product;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockAlertSummaryResponse {
    private Integer lowStockCount;
    private Integer outOfStockCount;
}
