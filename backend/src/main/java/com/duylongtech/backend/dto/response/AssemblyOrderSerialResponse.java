package com.duylongtech.backend.dto.response;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AssemblyOrderSerialResponse {
    private Long id;
    private Long assemblyOrderId;
    private Long targetVariantId;
    private String targetSerial;
    private Long componentVariantId;
    private String componentName;
    private String componentSerial;
    private String status;
    private LocalDateTime installedAt;
    private LocalDateTime removedAt;
    private Long sourceRepairId;
    private Long removedByRepairId;
    private String replacedBySerial;
    private String note;
}
