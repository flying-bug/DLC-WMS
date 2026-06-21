package com.duylongtech.backend.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WarehouseDetailResponse {

    private Long id;
    private String code;
    private String name;
    private String address;
    private String type;
    private String status;
    private Long creatorId;
    private String creatorName;
    private Long updaterId;
    private String updaterName;
    private Long version;

    // Metrics
    private Long totalSkus;
    private Long totalQuantity;
    private BigDecimal totalValue;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
