package com.duylongtech.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
public class AssemblyExecutionRequest {
    
    @NotNull(message = "Ngày thực thi không được để trống")
    private LocalDate executionDate;

    @NotNull(message = "Kho thực hiện không được để trống")
    private Long warehouseId;

    @NotEmpty(message = "Phải có ít nhất 1 bộ được thực thi")
    @Valid
    private List<AssemblySetRequest> assembledSets;

    @Data
    public static class AssemblySetRequest {
        @NotEmpty(message = "Serial thành phẩm không được để trống")
        private String parentSerial;

        @NotEmpty(message = "Danh sách linh kiện không được để trống")
        @Valid
        private List<AssemblyComponentRequest> components;
    }

    @Data
    public static class AssemblyComponentRequest {
        @NotNull(message = "Variant ID của linh kiện không được để trống")
        private Long variantId;

        @NotEmpty(message = "Serial của linh kiện không được để trống")
        private String serial;
    }
}
