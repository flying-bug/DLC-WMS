package com.duylongtech.backend.feature.warranty;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import com.duylongtech.backend.feature.product.SerialNumber;

/**
 * DTO trả về cho lịch sử bảo hành của khách hàng (Tab 2).
 * Thông tin được lấy từ WARRANTIES và REPAIRS.
 */
@Data
@Builder
public class WarrantyHistoryResponse {
    private Long warrantyId;
    private String warrantyCode;
    private String serialNumber;
    private LocalDate startDate;
    private LocalDate endDate;
    private String warrantyStatus;
    private List<RepairHistory> repairs;

    @Data
    @Builder
    public static class RepairHistory {
        private Long repairId;
        private String repairCode;
        private LocalDate receivedDate;
        private String repairStatus;
    }
}
