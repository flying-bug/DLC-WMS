package com.duylongtech.backend.feature.warehouse;

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
    private String fromWarehouseName;
    private Long toWarehouseId;
    private String toWarehouseName;
    private LocalDate transferDate;
    private String status;
    private String note;
    private String deliverer;
    private String attachedDocument;
    private Long referenceId;
    private String referenceType;
    private String referenceCode;
    private Long exportDocumentId;
    private String exportDocumentCode;
    private Long importDocumentId;
    private String importDocumentCode;
    private LocalDateTime createdAt;
    private List<StockTransferLineDTO> lines;
}
