package com.duylongtech.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
