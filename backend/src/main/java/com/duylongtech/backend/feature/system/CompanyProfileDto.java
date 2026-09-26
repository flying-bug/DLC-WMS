package com.duylongtech.backend.feature.system;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Thông tin doanh nghiệp (màn Thông tin doanh nghiệp) dùng chung cho toàn hệ thống: mẫu in, xuất Excel,
 * hóa đơn điện tử, email và tên hiển thị trên giao diện.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyProfileDto {
    /** Tên pháp lý (in trên hóa đơn, chứng từ). */
    private String name;
    /** Tên hiển thị / thương hiệu; chưa cài thì bằng tên pháp lý. */
    private String shortName;
    private String slogan;
    private String taxCode;
    private String address;
    private String phone;
    private String email;
    private String website;
    private String bankAccount;
}
