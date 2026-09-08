package com.duylongtech.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxLookupResponse {
    private boolean success;
    private String taxCode;
    private String name;
    private String internationalName;
    private String shortName;
    private String address;
    private String representative;
    private String status; // ACTIVE, INACTIVE, SUSPENDED, NOT_FOUND
    private String rawStatusText;
    private String phone;
    private String email;
    private String message;
}
