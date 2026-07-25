package com.duylongtech.backend.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemHealthDto {
    // Database
    private boolean dbOnline;
    private String dbVersion;
    private long dbSizeBytes;
    private String dbSizeFormatted;
    private long tableCount;

    // JVM Memory
    private long jvmTotalMb;
    private long jvmUsedMb;
    private long jvmFreeMb;
    private double jvmUsedPercent;

    // Disk (backup directory)
    private long diskTotalGb;
    private long diskUsedGb;
    private long diskFreeGb;
    private double diskUsedPercent;

    // Backup info
    private String lastBackupTime;
    private String lastBackupFilename;
    private long totalBackupFiles;
    private long totalBackupSizeBytes;
    private String totalBackupSizeFormatted;
}
