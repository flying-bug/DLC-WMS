package com.duylongtech.backend.feature.system;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendTestEmailRequest {
    private String toEmail;
}
