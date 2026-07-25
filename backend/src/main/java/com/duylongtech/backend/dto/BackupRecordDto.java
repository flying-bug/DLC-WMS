package com.duylongtech.backend.dto;

import com.duylongtech.backend.entity.BackupRecord;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BackupRecordDto {
    private Long id;
    private String filename;
    private Long fileSize;
    private String fileSizeFormatted;
    private BackupRecord.BackupStatus status;
    private String driveFileId;
    private String driveLink;
    private LocalDateTime createdAt;
    private String createdBy;
    private String note;
}
