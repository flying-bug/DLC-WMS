package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Request DTO để thêm/cập nhật dòng linh kiện trong Lệnh Sửa Chữa.
 */
@Data
public class RepairLineRequest {

    /** ID của ProductVariant (linh kiện) */
    @NotNull(message = "componentVariantId là bắt buộc")
    private Long componentVariantId;

    /** ADD (thêm từ kho) hoặc REMOVE (tháo ra vào Scrap) */
    @NotBlank(message = "actionType là bắt buộc")
    private String actionType;

    /** Số lượng */
    @NotNull(message = "quantity là bắt buộc")
    @DecimalMin(value = "0.0001", message = "quantity phải lớn hơn 0")
    private BigDecimal quantity;

    /** Đơn giá - tự động = 0 nếu isFreeWarranty = true */
    @DecimalMin(value = "0", message = "unitPrice không được âm")
    private BigDecimal unitPrice;

    /** Có miễn phí bảo hành không */
    private Boolean isFreeWarranty;

    /** Serial linh kiện (để truy vết) */
    private Long serialNumberId;

    /** Ghi chú */
    private String note;
}
