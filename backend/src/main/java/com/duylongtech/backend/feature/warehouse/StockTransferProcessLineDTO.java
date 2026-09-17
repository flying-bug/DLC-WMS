package com.duylongtech.backend.feature.warehouse;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockTransferProcessLineDTO {
    private Long lineId; // The ID of the StockTransferLine
    private Long variantId; // Useful for fallback
    private List<String> serialNumbers;
}
