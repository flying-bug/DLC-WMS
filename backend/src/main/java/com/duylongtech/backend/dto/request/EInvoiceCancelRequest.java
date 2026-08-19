package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EInvoiceCancelRequest {
    @NotBlank(message = "Lý do hủy hóa đơn không được để trống")
    private String reason;
}
