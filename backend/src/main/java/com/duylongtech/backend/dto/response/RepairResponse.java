package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO trả về thông tin chi tiết Lệnh Sửa Chữa.
 */
@Data
@Builder
public class RepairResponse {

    private Long id;
    private String repairCode;

    // Khách hàng
    private Long partnerId;
    private String partnerName;
    private String partnerPhone;

    // Sản phẩm/thiết bị
    private Long productId;
    private String productName;
    private Integer productQuantity;
    private String productUnit;

    // Kho thực hiện lệnh sửa chữa
    private Long warehouseId;

    // Serial thiết bị
    private Long serialNumberId;
    private String serialNumber;

    // Thông tin bảo hành liên kết
    private Long warrantyId;

    // Ngày
    private LocalDate receivedDate;
    private LocalDate expectedDate;
    private LocalDate completedDate;
    private LocalDate repairWarrantyEndDate;

    // Trạng thái state machine
    private String repairStatus;

    // Mô tả
    private String issueDescription;
    private String diagnosisNote;
    private String internalNotes;
    private String solutionDescription;

    // Bảo hành
    private Boolean underWarranty;

    // Phương thức hóa đơn
    private String invoiceMethod;

    // Tài chính
    private BigDecimal totalAmount;

    // Kỹ thuật viên phụ trách
    private String responsiblePerson;

    // Ghi chú
    private String note;

    // Audit
    private Long createdBy;
    private Long approvedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer version;

    // Chi tiết linh kiện và phí
    private List<RepairLineResponse> lines;
    private List<RepairFeeResponse> fees;
}
