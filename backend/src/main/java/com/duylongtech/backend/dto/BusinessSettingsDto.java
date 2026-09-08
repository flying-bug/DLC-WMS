package com.duylongtech.backend.dto;

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
    private String companyTaxCode;
    private String companyAddress;
    private String companyPhone;
    private String companyEmail;
    private String companyBankAccount;
}
