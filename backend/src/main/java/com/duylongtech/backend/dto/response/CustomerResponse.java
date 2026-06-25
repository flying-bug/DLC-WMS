package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Response DTO cho Khách hàng (Customer).
 * Trả về thông tin cần hiển thị trên danh sách và màn hình Quick Create.
 */
@Data
@Builder
public class CustomerResponse {

    private Long id;

    /** Mã khách hàng (auto-generated, VD: KH2026060001). */
    private String code;

    /** Loại pháp lý: INDIVIDUAL | COMPANY. */
    private String type;

    /** Tên khách hàng. */
    private String name;

    /** Số điện thoại (business key). */
    private String phone;

    /** Email. */
    private String email;

    /** Địa chỉ. */
    private String address;

    /** Nhóm khách hàng: RETAIL | WHOLESALE | DISTRIBUTOR. */
    private String groupType;

    /** Trạng thái: APPROVED | INACTIVE. */
    private String status;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
