package com.duylongtech.backend.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BackupScheduleDto {
    private boolean enabled;
    /** DAILY | WEEKLY | MONTHLY */
    private String scheduleType;
    /** HH:mm */
    private String scheduleTime;
    /** Day of week (1=Mon) for WEEKLY; day of month for MONTHLY */
    private int scheduleDay;
    /** Keep backups for N days, then auto-delete */
    private int retentionDays;
}
