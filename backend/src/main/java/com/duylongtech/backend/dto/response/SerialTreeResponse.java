package com.duylongtech.backend.dto.response;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SerialTreeResponse {
    private String targetSerial;
    private String targetSku;
    private String targetName;
    private List<ComponentSerial> components;
    private List<ComponentSerial> history;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ComponentSerial {
        private String componentSerial;
        private String componentSku;
        private String componentName;
        private String status;
        private LocalDateTime installedAt;
        private LocalDateTime removedAt;
        private Long removedByAssemblyOrderId;
        private String removedByAssemblyOrderCode;
        private Long sourceRepairId;
        private String sourceRepairCode;
        private Long removedByRepairId;
        private String removedByRepairCode;
        private String replacedBySerial;
        private String note;
    }
}
