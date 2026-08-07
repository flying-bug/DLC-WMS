package com.duylongtech.backend.dto.response;

import lombok.*;
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

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ComponentSerial {
        private String componentSerial;
        private String componentSku;
        private String componentName;
    }
}
