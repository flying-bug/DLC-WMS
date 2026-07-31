package com.duylongtech.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StocktakeLineSerialResponse {
    private Long id;
    private Long serialNumberId;
    private String serialNumber;
    private String scanStatus;
    private String note;
}
