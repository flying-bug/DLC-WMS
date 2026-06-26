package com.duylongtech.backend.dto;

import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockTransferRequestDTO {
    private String transferCode;
    private Long fromWarehouseId;
    private Long toWarehouseId;
    private LocalDate transferDate;
    private String note;
    private List<StockTransferLineDTO> lines;
}
