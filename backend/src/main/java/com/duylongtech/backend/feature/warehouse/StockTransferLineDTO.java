package com.duylongtech.backend.feature.warehouse;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockTransferLineDTO {
    private Long variantId;
    private String sku;
    private String variantName;
    private String productName;
    private BigDecimal quantity;
    private BigDecimal unitCost;
    private String note;
    private List<String> serialNumbers;
}
