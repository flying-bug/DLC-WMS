package com.duylongtech.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class SalesOrderRequest {

    @NotNull(message = "Khách hàng không được để trống")
    private Long partnerId;

    private Long warehouseId;

    private String soCode;

    @NotNull(message = "Ngày đặt hàng không được để trống")
    private LocalDate soDate;

    private LocalDate paymentDueDate;

    private String deliveryAddress;

    private String note;

    @NotNull
    @NotEmpty(message = "Đơn hàng phải có ít nhất 1 dòng sản phẩm")
    @Valid
    private List<SalesOrderLineRequest> lines;

    @Data
    public static class SalesOrderLineRequest {

        @NotNull(message = "Sản phẩm không được để trống")
        private Long variantId;

        private Long warehouseId; // Kho xuất hàng cho dòng này

        @NotNull
        @DecimalMin(value = "1", message = "Số lượng phải là số nguyên lớn hơn 0")
        private BigDecimal quantity;

        @NotNull
        @DecimalMin(value = "0.0000", message = "Đơn giá không được âm")
        private BigDecimal unitPrice;

        private BigDecimal vatRate;

        private Integer warrantyMonths;

        private String note;
    }
}
