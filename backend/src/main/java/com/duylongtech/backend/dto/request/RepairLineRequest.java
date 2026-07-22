package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request DTO để thêm/cập nhật dòng linh kiện trong Lệnh Sửa Chữa.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepairLineRequest {
    private Long id; // Optional, dùng khi cập nhật

    @NotNull(message = "componentVariantId là bắt buộc")
    private Long componentVariantId;

    @NotNull(message = "quantity là bắt buộc")
    @DecimalMin(value = "0.0001", message = "quantity phải lớn hơn 0")
    private BigDecimal quantity;

    @DecimalMin(value = "0", message = "unitPrice không được âm")
    private BigDecimal unitPrice;

    /** Có thuộc diện bảo hành không */
    private Boolean isWarrantyCovered;

    /** Ghi chú */
    private String note;
}
