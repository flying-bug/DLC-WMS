package com.duylongtech.backend.repository;

import com.duylongtech.backend.entity.BackupRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BackupRecordRepository extends JpaRepository<BackupRecord, Long> {
    List<BackupRecord> findAllByOrderByCreatedAtDesc();
    boolean existsByFilename(String filename);
    Optional<BackupRecord> findByFilename(String filename);
    Optional<BackupRecord> findByDriveFileId(String driveFileId);
}
