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

public interface SystemHealthService {
    SystemHealthDto getHealth();
}
