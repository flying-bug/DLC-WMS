package com.duylongtech.backend.entity;

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
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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
    @Builder.Default
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
    @Builder.Default
    private Boolean isCustomer = false;

    /**
     * Cờ đánh dấu đây là nhà cung cấp.
     */
    @Column(name = "is_supplier", nullable = false)
    @Builder.Default
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
    @Builder.Default
    private BigDecimal creditLimit = BigDecimal.ZERO;

    /**
     * Số ngày được nợ.
     */
    @Column(name = "payment_term_days", nullable = false)
    @Builder.Default
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
    @Builder.Default
    private String groupType = "RETAIL";

    /**
     * Trạng thái: APPROVED (đang hoạt động) | INACTIVE (ngừng hoạt động).
     * BR-11: Chỉ đổi INACTIVE thay vì xóa nếu đã có giao dịch.
     */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "APPROVED";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
