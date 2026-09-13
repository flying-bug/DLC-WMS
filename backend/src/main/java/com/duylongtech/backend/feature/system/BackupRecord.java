package com.duylongtech.backend.feature.system;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "backup_records")
@Getter
@NoArgsConstructor
public class BackupRecord {

    public enum BackupStatus {
        LOCAL, DRIVE, BOTH, FAILED, RESTORING
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "filename", nullable = false)
    private String filename;

    @Column(name = "file_size")
    private Long fileSize;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private BackupStatus status = BackupStatus.LOCAL;

    @Column(name = "drive_file_id")
    private String driveFileId;

    @Column(name = "drive_link")
    private String driveLink;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    public void initRecord(String filename, Long fileSize, BackupStatus status, String driveFileId, String driveLink, String createdBy, String note) {
        this.filename = filename;
        this.fileSize = fileSize;
        this.status = status != null ? status : BackupStatus.LOCAL;
        this.driveFileId = driveFileId;
        this.driveLink = driveLink;
        this.createdBy = createdBy;
        this.note = note;
    }

    public void updateStatus(BackupStatus status) {
        this.status = status;
    }

    public void updateFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public void updateDriveInfo(String driveFileId, String driveLink) {
        this.driveFileId = driveFileId;
        this.driveLink = driveLink;
    }
}
