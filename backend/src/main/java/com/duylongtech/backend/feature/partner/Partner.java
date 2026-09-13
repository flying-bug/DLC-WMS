package com.duylongtech.backend.feature.partner;

import com.duylongtech.backend.enums.DocumentStatus;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity đại diện cho đối tác (Nhà cung cấp / Khách hàng).
 * Bảng PARTNERS dùng chung cho cả Supplier (is_supplier=true) và Customer (is_customer=true).
 * BR-09: Mã đối tác (code) phải là unique trên toàn hệ thống.
 * BR-11: Không xóa vĩnh viễn nếu đã có giao dịch - chỉ đổi status INACTIVE.
 */
@Entity
@Table(name = "PARTNERS")
@Getter
@NoArgsConstructor
public class Partner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Mã nhà cung cấp / khách hàng - unique.
     * BR-09: Mã đối tác phải là định danh duy nhất trên toàn hệ thống.
     */
    @Column(nullable = false, unique = true, length = 50)
    private String code;

    /**
     * Loại pháp lý: COMPANY (Tổ chức) | INDIVIDUAL (Cá nhân).
     */
    @Column(nullable = false, length = 20)
    private String type = "COMPANY";

    /**
     * Tên nhà cung cấp / khách hàng (bắt buộc).
     */
    @Column(nullable = false, length = 150)
    private String name;

    /**
     * Số điện thoại.
     */
    @Column(length = 20)
    private String phone;

    /**
     * Địa chỉ email.
     */
    @Column(length = 100)
    private String email;

    /**
     * Địa chỉ.
     */
    @Column(columnDefinition = "TEXT")
    private String address;

    /**
     * Mã số thuế.
     */
    @Column(name = "tax_code", length = 50)
    private String taxCode;

    /**
     * Cờ đánh dấu đây là khách hàng.
     */
    @Column(name = "is_customer", nullable = false)
    private Boolean isCustomer = false;

    /**
     * Cờ đánh dấu đây là nhà cung cấp.
     */
    @Column(name = "is_supplier", nullable = false)
    private Boolean isSupplier = false;

    /**
     * Đối tác cha (dùng cho phân cấp nếu có).
     */
    @Column(name = "parent_id")
    private Long parentId;

    /**
     * Hạn mức công nợ.
     */
    @Column(name = "credit_limit", nullable = false, precision = 15, scale = 2)
    private BigDecimal creditLimit = BigDecimal.ZERO;

    /**
     * Số ngày được nợ.
     */
    @Column(name = "payment_term_days", nullable = false)
    private Integer paymentTermDays = 0;

    /**
     * Số tài khoản ngân hàng.
     */
    @Column(name = "bank_account_number", length = 50)
    private String bankAccountNumber;

    /**
     * Tên ngân hàng.
     */
    @Column(name = "bank_name", length = 100)
    private String bankName;

    /**
     * Tên chủ tài khoản ngân hàng.
     */
    @Column(name = "bank_beneficiary_name", length = 100)
    private String bankBeneficiaryName;

    /**
     * Nhóm đối tác.
     * Với khách hàng: RETAIL, WHOLESALE, DISTRIBUTOR
     * Với nhà cung cấp: nhóm ngành hàng (vd: "Sản phẩm công nghệ")
     */
    @Column(name = "group_type", nullable = false, length = 50)
    private String groupType = "RETAIL";

    /**
     * Trạng thái: APPROVED (đang hoạt động) | INACTIVE (ngừng hoạt động).
     * BR-11: Chỉ đổi INACTIVE thay vì xóa nếu đã có giao dịch.
     */
    @Column(nullable = false, length = 20)
    private String status = DocumentStatus.APPROVED.name();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void initPartner(String code, String name, String type, Boolean isCustomer, Boolean isSupplier, String groupType) {
        this.code = code;
        this.name = name;
        this.type = type != null ? type : "COMPANY";
        this.isCustomer = isCustomer != null ? isCustomer : false;
        this.isSupplier = isSupplier != null ? isSupplier : false;
        this.groupType = groupType != null ? groupType : "RETAIL";
        this.status = DocumentStatus.APPROVED.name();
    }

    public void updateContact(String phone, String email, String address, String taxCode) {
        this.phone = phone;
        this.email = email;
        this.address = address;
        this.taxCode = taxCode;
    }

    public void updateFinancial(BigDecimal creditLimit, Integer paymentTermDays, String bankAccountNumber, String bankName, String bankBeneficiaryName) {
        this.creditLimit = creditLimit != null ? creditLimit : BigDecimal.ZERO;
        this.paymentTermDays = paymentTermDays != null ? paymentTermDays : 0;
        this.bankAccountNumber = bankAccountNumber;
        this.bankName = bankName;
        this.bankBeneficiaryName = bankBeneficiaryName;
    }

    public void updateBasic(String name, String type, String groupType, Long parentId) {
        this.name = name;
        if (type != null) this.type = type;
        if (groupType != null) this.groupType = groupType;
        this.parentId = parentId;
    }

    public void deactivate() {
        this.status = "INACTIVE";
    }

    public void activate() {
        this.status = DocumentStatus.APPROVED.name();
    }

    public void setCode(String code) {
        this.code = code;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }
}
