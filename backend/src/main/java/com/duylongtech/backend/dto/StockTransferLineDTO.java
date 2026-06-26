package com.duylongtech.backend.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockTransferLineDTO {
    private Long variantId;
    private BigDecimal quantity;
    private String note;
}
