package com.duylongtech.backend.component;

import com.duylongtech.backend.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class AuditLogCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(AuditLogCleanupJob.class);

    private final AuditLogRepository auditLogRepository;

    @Value("${app.audit.retention-days:365}")
    private int retentionDays;

    public AuditLogCleanupJob(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Scheduled(cron = "${app.audit.cleanup-cron:0 0 2 * * ?}")
    @Transactional
    public void cleanupOldAuditLogs() {
        log.info("Starting audit log cleanup job. Retention period: {} days", retentionDays);
        try {
            Instant cutoffDate = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
            int deletedCount = auditLogRepository.deleteLogsOlderThan(cutoffDate);
            log.info("Audit log cleanup completed successfully. Deleted {} old audit logs.", deletedCount);
        } catch (Exception e) {
            log.error("Error occurred during audit log cleanup: ", e);
        }
    }
}
