package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RepairFeeRequest {

    @NotBlank(message = "Tên phí dịch vụ không được để trống")
    private String feeName;

    @NotNull(message = "Số tiền phí không được để trống")
    @PositiveOrZero(message = "Số tiền phí phải lớn hơn hoặc bằng 0")
    private BigDecimal feeAmount;

    private Boolean isFreeWarranty;
    
    private String note;
}
