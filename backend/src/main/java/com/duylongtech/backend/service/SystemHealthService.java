package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.SystemHealthDto;
import com.duylongtech.backend.entity.BackupRecord;
import com.duylongtech.backend.repository.BackupRecordRepository;
import com.duylongtech.backend.repository.SystemSettingRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemHealthService {

    @PersistenceContext
    private EntityManager entityManager;

    private final BackupRecordRepository backupRecordRepository;
    private final SystemSettingRepository systemSettingRepository;

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

    public SystemHealthDto getHealth() {
        // ── DB health ────────────────────────────────────────────────────────────
        boolean dbOnline = false;
        String dbVersion = "N/A";
        long dbSizeBytes = 0;
        long tableCount = 0;

        try {
            dbVersion = (String) entityManager
                    .createNativeQuery("SELECT VERSION()").getSingleResult();
            dbOnline = true;

            // DB size in bytes
            Number sizeResult = (Number) entityManager.createNativeQuery(
                    "SELECT SUM(data_length + index_length) " +
                    "FROM information_schema.tables " +
                    "WHERE table_schema = DATABASE()"
            ).getSingleResult();
            if (sizeResult != null) dbSizeBytes = sizeResult.longValue();

            // Table count
            Number tblResult = (Number) entityManager.createNativeQuery(
                    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()"
            ).getSingleResult();
            if (tblResult != null) tableCount = tblResult.longValue();

        } catch (Exception e) {
            log.warn("Cannot query DB health: {}", e.getMessage());
        }

        // ── JVM Memory ───────────────────────────────────────────────────────────
        Runtime rt = Runtime.getRuntime();
        long jvmTotalMb = rt.totalMemory() / 1024 / 1024;
        long jvmFreeMb  = rt.freeMemory()  / 1024 / 1024;
        long jvmUsedMb  = jvmTotalMb - jvmFreeMb;
        double jvmUsedPct = jvmTotalMb > 0 ? (jvmUsedMb * 100.0 / jvmTotalMb) : 0;

        // ── Disk (backup dir) ────────────────────────────────────────────────────
        String backupPath = systemSettingRepository.findBySettingKey("backup.path")
                .map(s -> s.getSettingValue()).orElse("/tmp/backups");
        File backupDir = new File(backupPath);
        if (!backupDir.exists()) backupDir.mkdirs();

        long diskTotalGb = backupDir.getTotalSpace() / 1024 / 1024 / 1024;
        long diskFreeGb  = backupDir.getFreeSpace()  / 1024 / 1024 / 1024;
        long diskUsedGb  = diskTotalGb - diskFreeGb;
        double diskUsedPct = diskTotalGb > 0 ? (diskUsedGb * 100.0 / diskTotalGb) : 0;

        // ── Backup info ──────────────────────────────────────────────────────────
        List<BackupRecord> records = backupRecordRepository.findAllByOrderByCreatedAtDesc();
        String lastBackupTime = "";
        String lastBackupFilename = "";
        long totalBackupSizeBytes = 0;

        if (!records.isEmpty()) {
            BackupRecord latest = records.get(0);
            lastBackupFilename = latest.getFilename();
            LocalDateTime lat = latest.getCreatedAt();
            if (lat != null) lastBackupTime = lat.format(DT_FMT);
        }
        for (BackupRecord r : records) {
            if (r.getFileSize() != null) totalBackupSizeBytes += r.getFileSize();
        }

        return SystemHealthDto.builder()
                .dbOnline(dbOnline)
                .dbVersion(dbVersion)
                .dbSizeBytes(dbSizeBytes)
                .dbSizeFormatted(formatBytes(dbSizeBytes))
                .tableCount(tableCount)
                .jvmTotalMb(jvmTotalMb)
                .jvmUsedMb(jvmUsedMb)
                .jvmFreeMb(jvmFreeMb)
                .jvmUsedPercent(Math.round(jvmUsedPct * 10.0) / 10.0)
                .diskTotalGb(diskTotalGb)
                .diskUsedGb(diskUsedGb)
                .diskFreeGb(diskFreeGb)
                .diskUsedPercent(Math.round(diskUsedPct * 10.0) / 10.0)
                .lastBackupTime(lastBackupTime)
                .lastBackupFilename(lastBackupFilename)
                .totalBackupFiles(records.size())
                .totalBackupSizeBytes(totalBackupSizeBytes)
                .totalBackupSizeFormatted(formatBytes(totalBackupSizeBytes))
                .build();
    }

    public static String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        if (bytes < 1024L * 1024 * 1024) return String.format("%.1f MB", bytes / 1024.0 / 1024.0);
        return String.format("%.2f GB", bytes / 1024.0 / 1024.0 / 1024.0);
    }
}
