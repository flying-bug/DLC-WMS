package com.duylongtech.backend.dto.response;

import lombok.Data;

@Data
public class AssemblyOrderSerialResponse {
    private Long id;
    private Long assemblyOrderId;
    private Long targetVariantId;
    private String targetSerial;
    private Long componentVariantId;
    private String componentName;
    private String componentSerial;
}
