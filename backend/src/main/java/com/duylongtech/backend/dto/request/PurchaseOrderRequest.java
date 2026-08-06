package com.duylongtech.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class PurchaseOrderRequest {

    @NotNull(message = "Nhà cung cấp không được để trống")
    private Long partnerId;

    private String poCode;

    @NotNull(message = "Ngày đặt hàng không được để trống")
    private LocalDate poDate;

    private LocalDate paymentDueDate;

    private LocalDate expectedDeliveryDate;

    private String note;

    @NotNull
    @NotEmpty(message = "Đơn hàng phải có ít nhất 1 dòng sản phẩm")
    @Valid
    private List<PurchaseOrderLineRequest> lines;

    @Data
    public static class PurchaseOrderLineRequest {

        @NotNull(message = "Sản phẩm không được để trống")
        private Long variantId;

        @NotNull
        @DecimalMin(value = "1", message = "Số lượng phải là số nguyên lớn hơn 0")
        private BigDecimal quantity;

        @NotNull
        @DecimalMin(value = "0.0000", message = "Đơn giá không được âm")
        private BigDecimal unitPrice;

        private BigDecimal vatRate; // % thuế VAT, mặc định 0

        private String note;
    }
}
