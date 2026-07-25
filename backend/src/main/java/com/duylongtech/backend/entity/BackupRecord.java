package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "backup_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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
    @Builder.Default
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
}
