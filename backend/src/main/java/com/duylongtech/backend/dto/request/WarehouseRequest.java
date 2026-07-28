package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WarehouseRequest {

    @Size(max = 50, message = "Mã kho không được vượt quá 50 ký tự")
    private String code;

    @NotBlank(message = "Tên kho là bắt buộc")
    @Size(max = 100, message = "Tên kho không được vượt quá 100 ký tự")
    private String name;

    private String address;

    private String status;

    private Long version;
}
