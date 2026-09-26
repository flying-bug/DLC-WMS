package com.duylongtech.backend.feature.system;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BusinessSettingsDto {
    private Integer defaultVatRate;
    private List<Integer> allowedVatRates;
    private String companyName;
    /** Tên hiển thị / thương hiệu: dùng trên menu, đầu các mẫu in, email. Để trống thì dùng tên doanh nghiệp. */
    private String companyShortName;
    /** Dòng phụ dưới tên trên mẫu in (VD: "Since 2003"). */
    private String companySlogan;
    private String companyTaxCode;
    private String companyAddress;
    private String companyPhone;
    private String companyEmail;
    private String companyWebsite;
    private String companyBankAccount;
}
