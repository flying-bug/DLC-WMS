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
    private String status;
    private String deliverer;
    private String attachedDocument;
    private Long referenceId;
    private String referenceType;
    private String referenceCode;
    private List<StockTransferLineDTO> lines;
}
