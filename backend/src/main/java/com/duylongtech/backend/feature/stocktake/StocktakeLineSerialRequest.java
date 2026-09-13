package com.duylongtech.backend.feature.stocktake;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.duylongtech.backend.feature.product.SerialNumber;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StocktakeLineSerialRequest {
    private Long serialNumberId;
    private String serialNumber;
    private String scanStatus;
    private String note;
}
