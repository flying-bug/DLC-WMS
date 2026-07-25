package com.duylongtech.backend.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemSettingsDto {
    // Storage
    private String backupPath;

    // Google Drive
    private boolean driveEnabled;
    private String driveFolderId;
    /** true if service account JSON is configured */
    private boolean driveConfigured;

    // Security
    private boolean encryptEnabled;
    private String encryptKey;

    // Notifications
    private boolean notifyEmailEnabled;
    private String notifyEmailTo;
}
