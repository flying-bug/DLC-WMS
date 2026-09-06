package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Request DTO để thêm/cập nhật phí dịch vụ trong Lệnh Sửa Chữa.
 */
@Data
public class RepairFeeRequest {

    /** Tên phí dịch vụ (VD: Phí vệ sinh máy, Phí công thợ) */
    @NotBlank(message = "feeName là bắt buộc")
    private String feeName;

    /** Số tiền phí - tự động = 0 nếu isFreeWarranty = true */
    @NotNull(message = "feeAmount là bắt buộc")
    @DecimalMin(value = "0", message = "feeAmount không được âm")
    private BigDecimal feeAmount;

    /** Có miễn phí bảo hành không */
    private Boolean isFreeWarranty;

    /** Số lượng */
    private BigDecimal quantity;

    /** Đơn vị tính */
    private String unitName;

    /** Ghi chú */
    private String note;
    
    /** Thuế GTGT (%) */
    private BigDecimal vatPercent;
}
