package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

/**
 * Request DTO để tạo mới hoặc cập nhật Lệnh Sửa Chữa.
 */
@Data
public class RepairRequest {

    /** Mã lệnh sửa chữa tự tạo từ frontend (tùy chọn) */
    private String repairCode;

    /** Khách hàng (bắt buộc) */
    @NotNull(message = "partnerId là bắt buộc")
    private Long partnerId;

    /** Sản phẩm/thiết bị đang sửa */
    @NotNull(message = "productId là bắt buộc")
    private Long productId;

    private Integer productQuantity;
    private String productUnit;

    /** Kho thực hiện lệnh sửa chữa */
    private Long warehouseId;

    /** Serial của thiết bị (nullable nếu thiết bị ngoài) */
    private Long serialNumberId;

    /** Liên kết bảo hành (nullable) */
    private Long warrantyId;

    /** Mô tả lỗi */
    private String issueDescription;

    /** Ghi chú chẩn đoán */
    private String diagnosisNote;

    /** Ghi chú nội bộ */
    private String internalNotes;

    /** Có trong hạn bảo hành không */
    private Boolean underWarranty;

    /** Hạn bảo hành sau sửa chữa */
    private LocalDate repairWarrantyEndDate;

    /** Phương thức hóa đơn: none | b4repair | after_repair */
    private String invoiceMethod;

    /** Ngày tiếp nhận */
    private LocalDate receivedDate;

    /** Ngày dự kiến */
    private LocalDate expectedDate;

    /** Kỹ thuật viên phụ trách */
    private String responsiblePerson;

    /** Ghi chú */
    private String note;
}
