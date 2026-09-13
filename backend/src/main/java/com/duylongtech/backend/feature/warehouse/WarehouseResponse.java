package com.duylongtech.backend.feature.warehouse;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WarehouseResponse {

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
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
