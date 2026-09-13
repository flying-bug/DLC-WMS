package com.duylongtech.backend.feature.system;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GmailConnectionStatusDto {
    private boolean connected;
    private String connectedEmail;
    private String connectedAt;
}
