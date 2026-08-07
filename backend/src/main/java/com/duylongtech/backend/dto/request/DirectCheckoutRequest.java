package com.duylongtech.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class DirectCheckoutRequest {
    private String customerPhone;
    private String customerName;
    private String customerAddress;

    @NotNull(message = "Kho không được để trống")
    private Long warehouseId;

    private LocalDate checkoutDate;

    @DecimalMin(value = "0.00", message = "Số tiền thanh toán không được âm")
    private BigDecimal paymentAmount;

    private String note;

    @NotEmpty(message = "Phải có ít nhất 1 dòng sản phẩm")
    @Valid
    private List<Line> lines;

    @Data
    public static class Line {
        @NotNull(message = "Sản phẩm không được để trống")
        private Long variantId;

        @NotNull(message = "Số lượng không được để trống")
        @DecimalMin(value = "1.00", message = "Số lượng phải lớn hơn 0")
        private BigDecimal quantity;

        @NotNull(message = "Đơn giá không được để trống")
        @DecimalMin(value = "0.00", message = "Đơn giá không được âm")
        private BigDecimal unitPrice;

        private BigDecimal vatRate;
        private Integer warrantyMonths;
        private List<String> serialNumbers;
        private String note;
    }
}
