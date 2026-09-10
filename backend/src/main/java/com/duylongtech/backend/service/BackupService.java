package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.BackupRecordDto;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.BackupScheduleDto;
import com.duylongtech.backend.entity.BackupRecord;
import com.duylongtech.backend.entity.SystemSetting;
import com.duylongtech.backend.repository.BackupRecordRepository;
import com.duylongtech.backend.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.zip.GZIPOutputStream;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.core.env.Environment;

public interface BackupService {
    BackupRecord createBackup(String actor) throws Exception;
    BackupRecord uploadToDrive(BackupRecord record) throws Exception;
    BackupRecord uploadToDriveById(Long id) throws Exception;
    List<BackupRecordDto> fetchFromDrive() throws Exception;
    BackupRecordDto pullFromDrive(Long id) throws Exception;
    void restoreBackup(Long id, String userEncryptionKey) throws Exception;
    void syncDiskBackupsWithDb();
    void deleteBackup(Long id) throws Exception;
    List<BackupRecordDto> listBackups();
    Path getBackupFilePath(Long id) throws Exception;
    BackupScheduleDto getSchedule();
    void saveSchedule(BackupScheduleDto dto);
    void applyRetentionPolicy();
    BackupRecordDto toDto(BackupRecord r);
}
