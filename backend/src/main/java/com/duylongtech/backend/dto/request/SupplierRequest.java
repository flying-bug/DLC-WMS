package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

/**
 * Request DTO cho tạo mới / cập nhật Nhà Cung Cấp (Supplier).
 * Áp dụng validation theo CONTRIBUTING.md và FR 3.5 trong report3.txt.
 */
@Data
public class SupplierRequest {

    /**
     * Mã nhà cung cấp (optional - tự động sinh nếu null).
     * BR-09: Phải unique trên toàn hệ thống.
     */
    private String code;

    /**
     * Loại pháp lý: COMPANY (Tổ chức) | INDIVIDUAL (Cá nhân).
     */
    private String type;

    /**
     * Tên nhà cung cấp (bắt buộc).
     */
    @NotBlank(message = "FIELD_REQUIRED")
    @Size(max = 150, message = "EXCEED_MAX_LENGTH")
    private String name;

    /**
     * Số điện thoại - validate định dạng Việt Nam.
     */
    @Pattern(regexp = "^0[235789]\\d{8,9}$", message = "INVALID_PHONE")
    private String phone;

    /**
     * Địa chỉ email.
     */
    @Email(message = "INVALID_EMAIL")
    private String email;

    /**
     * Địa chỉ.
     */
    private String address;

    /**
     * Mã số thuế.
     */
    @Size(max = 50, message = "EXCEED_MAX_LENGTH")
    private String taxCode;

    /**
     * Nhóm nhà cung cấp (vd: "Sản phẩm công nghệ").
     */
    private String groupType;

    /**
     * Trạng thái: APPROVED | INACTIVE.
     */
    private String status;

    // --- Thông tin ngân hàng ---

    /**
     * Số tài khoản ngân hàng.
     */
    private String bankAccountNumber;

    /**
     * Tên ngân hàng.
     */
    private String bankName;

    /**
     * Tên chủ tài khoản.
     */
    private String bankBeneficiaryName;

    // --- Điều khoản thanh toán ---

    /**
     * Hạn mức công nợ.
     */
    private BigDecimal creditLimit;

    /**
     * Số ngày được nợ.
     */
    private Integer paymentTermDays;

    // --- Người liên hệ (contact info) ---

    /**
     * Tên người liên hệ.
     */
    private String contactName;

    /**
     * Website.
     */
    private String website;
}
