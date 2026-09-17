package com.duylongtech.backend.feature.repair;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import com.duylongtech.backend.feature.product.SerialNumber;

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
    private Long productVariantId;
    private String sku;
    private String variantName;
    private String manualDeviceName;
    private String manualDeviceIdentifier;
    private String externalDeviceStatus;
    private Integer productQuantity;
    private String productUnit;

    // Kho thực hiện lệnh sửa chữa
    private Long warehouseId;
    private Long scrapWarehouseId;

    // Serial thiết bị
    private Long serialNumberId;
    private String serialNumber;

    // Thông tin bảo hành liên kết
    private Long warrantyId;

    // Thông tin tham chiếu chứng từ chung
    private String referenceType;
    private Long referenceId;
    private String referenceCode;

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
    private String feePolicy;
    private BigDecimal customerSharePercent;
    private BigDecimal customerPayAmount;
    private BigDecimal companyCoveredAmount;

    // Kỹ thuật viên phụ trách
    private String responsiblePerson;
    private Long assignedTechnicianId;
    private String assignedTechnicianName;
    private String repairOutcome;
    private String rejectReason;
    private LocalDateTime rejectedAt;
    private Long rejectedBy;
    private LocalDateTime submittedAt;
    private Long submittedBy;
    private LocalDateTime acceptedAt;
    private Long acceptedBy;
    private LocalDateTime completedAt;
    private Long completedBy;
    private String cancelReason;
    private LocalDateTime cancelledAt;
    private Long cancelledBy;
    private LocalDateTime returnedAt;
    private Long returnedBy;
    private String recipientName;
    private String recipientPhone;
    private String returnNote;
    private String handoverCode;
    private Set<String> allowedActions;

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
    private List<RepairPhotoResponse> photos;
}
