package com.duylongtech.backend.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockTransferResponseDTO {
    private Long id;
    private String transferCode;
    private Long fromWarehouseId;
    private Long toWarehouseId;
    private LocalDate transferDate;
    private String status;
    private String note;
    private LocalDateTime createdAt;
    private List<StockTransferLineDTO> lines;
}
