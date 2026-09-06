package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO trả về cho lịch sử thu chi của khách hàng (Tab 3).
 * Bao gồm tổng kết (Summary) và danh sách phân trang.
 */
@Data
@Builder
public class ReceiptHistoryResponse {

    private Summary summary;
    private Page<ReceiptItem> receipts;

    @Data
    @Builder
    public static class Summary {
        private BigDecimal totalPaid;
    }

    @Data
    @Builder
    public static class ReceiptItem {
        private Long receiptId;
        private String receiptCode;
        private BigDecimal amount;
        private String status;
        private String paymentMethod;
        private LocalDateTime createdAt;
        private String note;
        private String type; // "RECEIPT" (Thu) hoặc "VOUCHER" (Chi)
    }
}
