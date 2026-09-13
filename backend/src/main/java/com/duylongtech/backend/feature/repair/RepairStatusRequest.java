package com.duylongtech.backend.feature.repair;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Request DTO để chuyển trạng thái Lệnh Sửa Chữa.
 * Valid statuses: QUOTATION, CONFIRMED, UNDER_REPAIR, DONE, CANCELLED
 */
@Data
public class RepairStatusRequest {

    @NotBlank(message = "status là bắt buộc")
    private String status;

    /** Ghi chú kèm theo khi chuyển trạng thái (optional) */
    private String note;
}
