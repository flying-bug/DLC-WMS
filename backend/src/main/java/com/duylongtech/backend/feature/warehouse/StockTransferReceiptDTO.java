package com.duylongtech.backend.feature.warehouse;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockTransferReceiptDTO {
    private List<StockTransferProcessLineDTO> lines;
}
