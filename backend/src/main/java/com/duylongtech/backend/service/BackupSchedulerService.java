package com.duylongtech.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class BackupSchedulerService {

    private final BackupService backupService;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private String lastRunMinute = "";

    /**
     * Runs every 30 seconds, checks if a scheduled backup should run now in Vietnam timezone.
     */
    @Scheduled(fixedDelay = 30_000)
    public void checkAndRunSchedule() {
        try {
            com.duylongtech.backend.dto.BackupScheduleDto schedule = backupService.getSchedule();
            if (!schedule.isEnabled()) return;

            LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
            String nowTime = now.format(TIME_FMT); // "HH:mm"
            String targetTime = schedule.getScheduleTime(); // e.g. "03:15"

            if (!nowTime.equals(targetTime)) return;

            String currentMinuteKey = now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH:mm"));
            if (currentMinuteKey.equals(lastRunMinute)) return;

            boolean shouldRun = switch (schedule.getScheduleType().toUpperCase()) {
                case "DAILY"   -> true;
                case "WEEKLY"  -> now.getDayOfWeek().getValue() == schedule.getScheduleDay();
                case "MONTHLY" -> now.getDayOfMonth() == schedule.getScheduleDay();
                default        -> false;
            };

            if (shouldRun) {
                lastRunMinute = currentMinuteKey;
                log.info("Scheduled backup triggered at {} (Vietnam Time)", now);
                backupService.createBackup("scheduler");
                backupService.applyRetentionPolicy();
            }

        } catch (Exception e) {
            log.error("Scheduled backup error: {}", e.getMessage(), e);
        }
    }
}
