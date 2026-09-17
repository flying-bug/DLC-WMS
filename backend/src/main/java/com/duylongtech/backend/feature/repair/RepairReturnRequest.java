package com.duylongtech.backend.feature.repair;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import com.duylongtech.backend.constant.AppConstants;
import lombok.Data;

@Data
public class RepairReturnRequest {
    @NotBlank private String recipientName;
    @NotBlank @Pattern(regexp = AppConstants.MOBILE_REGEX, message = "INVALID_PHONE") private String recipientPhone;
    private String note;
}
