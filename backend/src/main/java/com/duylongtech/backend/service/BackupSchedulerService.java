package com.duylongtech.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class BackupSchedulerService {

    private final BackupService backupService;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    /**
     * Runs every minute, checks if a scheduled backup should run now.
     * This is simpler than Quartz and fits the use-case (1-min granularity is fine for nightly backups).
     */
    @Scheduled(fixedDelay = 60_000) // every 60 seconds
    public void checkAndRunSchedule() {
        try {
            com.duylongtech.backend.dto.BackupScheduleDto schedule = backupService.getSchedule();
            if (!schedule.isEnabled()) return;

            LocalDateTime now = LocalDateTime.now();
            String nowTime = now.format(TIME_FMT); // "HH:mm"
            String targetTime = schedule.getScheduleTime(); // "02:00"

            if (!nowTime.equals(targetTime)) return;

            boolean shouldRun = switch (schedule.getScheduleType().toUpperCase()) {
                case "DAILY"   -> true;
                case "WEEKLY"  -> now.getDayOfWeek().getValue() == schedule.getScheduleDay();
                case "MONTHLY" -> now.getDayOfMonth() == schedule.getScheduleDay();
                default        -> false;
            };

            if (shouldRun) {
                log.info("Scheduled backup triggered at {}", now);
                backupService.createBackup("scheduler");
                backupService.applyRetentionPolicy();
            }

        } catch (Exception e) {
            log.error("Scheduled backup error: {}", e.getMessage(), e);
        }
    }
}
