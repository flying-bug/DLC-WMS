package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO cho Nhà Cung Cấp (Supplier).
 * Trả về đầy đủ thông tin cần hiển thị theo FR 3.5 trong report3.txt.
 */
@Data
@Builder
public class SupplierResponse {

    private Long id;

    /** Mã nhà cung cấp. */
    private String code;

    /** Loại pháp lý: COMPANY | INDIVIDUAL. */
    private String type;

    /** Tên nhà cung cấp. */
    private String name;

    /** Số điện thoại. */
    private String phone;

    /** Email. */
    private String email;

    /** Địa chỉ. */
    private String address;

    /** Mã số thuế. */
    private String taxCode;

    /** Nhóm nhà cung cấp. */
    private String groupType;

    /** Trạng thái: APPROVED | INACTIVE. */
    private String status;

    // --- Ngân hàng ---
    private String bankAccountNumber;
    private String bankName;
    private String bankBeneficiaryName;

    // --- Điều khoản thanh toán ---
    private BigDecimal creditLimit;
    private Integer paymentTermDays;

    // --- Thông tin bổ sung ---
    private String contactName;
    private String website;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** Tổng nợ hiện tại. */
    private BigDecimal currentDebt;
}
