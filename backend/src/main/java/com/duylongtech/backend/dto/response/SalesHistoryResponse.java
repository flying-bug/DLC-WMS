package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO trả về cho lịch sử mua hàng của khách hàng (Tab 1).
 * Thông tin được lấy từ SALES_ORDERS và SALES_ORDER_LINES.
 */
@Data
@Builder
public class SalesHistoryResponse {
    private Long orderId;
    private String orderCode;
    private LocalDate orderDate;
    private String productName;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal lineAmount;
    private String status;
    private String serialNumber; // Có thể null nếu sản phẩm không quản lý theo Serial
}
