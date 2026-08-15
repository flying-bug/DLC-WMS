package com.duylongtech.backend.job;

import com.duylongtech.backend.entity.SystemSetting;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.repository.InventoryDailySnapshotRepository;
import com.duylongtech.backend.repository.SystemSettingRepository;
import com.duylongtech.backend.repository.UserRepository;
import com.duylongtech.backend.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DailyInventorySnapshotJob {

    private final InventoryDailySnapshotRepository snapshotRepository;
    private final EmailService emailService;
    private final SystemSettingRepository settingRepo;
    private final UserRepository userRepository;

    private static final java.time.format.DateTimeFormatter TIME_FMT = java.time.format.DateTimeFormatter.ofPattern("HH:mm");
    private static final java.time.ZoneId VIETNAM_ZONE = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
    private String lastRunDate = "";

    /**
     * Tự động kiểm tra mỗi 30 giây để chốt sổ kho đúng giờ được cấu hình (theo giờ Việt Nam).
     */
    @Scheduled(fixedDelay = 30_000)
    public void checkAndRunDailySnapshot() {
        try {
            String configuredTime = settingRepo.findBySettingKey("snapshot.time")
                    .map(SystemSetting::getSettingValue)
                    .filter(s -> !s.isBlank())
                    .orElse("00:05");

            LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
            String nowTime = now.format(TIME_FMT); // "HH:mm"

            if (!nowTime.equals(configuredTime)) return;

            String currentDateKey = now.format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd"));
            if (currentDateKey.equals(lastRunDate)) return;

            lastRunDate = currentDateKey;
            LocalDate yesterday = now.toLocalDate().minusDays(1);
            log.info("[DailyInventorySnapshotJob] Bắt đầu tự động chốt sổ kho ngày {} (theo giờ cấu hình: {})", yesterday, configuredTime);
            snapshotDate(yesterday);
            log.info("[DailyInventorySnapshotJob] Tự động chốt sổ kho ngày {} hoàn tất.", yesterday);
        } catch (Exception e) {
            log.error("[DailyInventorySnapshotJob] Lỗi trong tiến trình kiểm tra lịch chốt sổ: {}", e.getMessage(), e);
        }
    }

    /**
     * Chốt sổ cho một ngày cụ thể (có thể dùng gọi thủ công hoặc re-calculate).
     */
    @Transactional
    public void snapshotDate(LocalDate date) {
        LocalDateTime endOfDay = date.atTime(LocalTime.MAX);
        try {
            snapshotRepository.upsertDailySnapshotForDate(date, endOfDay);
            log.info("[DailyInventorySnapshotJob] Đã upsert snapshot cho ngày {}", date);

            // Thu thập số liệu thống kê sau khi chốt sổ
            long recordCount = 0;
            double totalQty = 0;
            BigDecimal totalVal = BigDecimal.ZERO;

            List<Object[]> summary = snapshotRepository.getSummaryByDate(date);
            if (summary != null && !summary.isEmpty() && summary.get(0) != null) {
                Object[] row = summary.get(0);
                if (row.length > 0 && row[0] != null) recordCount = ((Number) row[0]).longValue();
                if (row.length > 1 && row[1] != null) totalQty = ((Number) row[1]).doubleValue();
                if (row.length > 2 && row[2] != null) totalVal = new BigDecimal(row[2].toString());
            }

            sendNotification(date, recordCount, totalQty, totalVal, true, null);
        } catch (Exception e) {
            log.error("[DailyInventorySnapshotJob] Lỗi khi tạo snapshot cho ngày {}: {}", date, e.getMessage(), e);
            sendNotification(date, 0, 0, BigDecimal.ZERO, false, e.getMessage());
        }
    }

    private void sendNotification(LocalDate date, long recordCount, double totalQty, BigDecimal totalVal, boolean isSuccess, String errorDetails) {
        try {
            String notifyEnabled = settingRepo.findBySettingKey("notify.email.enabled")
                    .map(SystemSetting::getSettingValue)
                    .orElse("true");

            if ("false".equalsIgnoreCase(notifyEnabled)) {
                log.info("[DailyInventorySnapshotJob] Gửi thông báo qua email đang bị tắt trong cài đặt hệ thống.");
                return;
            }

            String emailTo = settingRepo.findBySettingKey("notify.email.to")
                    .map(SystemSetting::getSettingValue)
                    .filter(s -> !s.isBlank())
                    .orElse(null);

            if (emailTo == null || emailTo.isBlank()) {
                // Lấy email của SUPER_ADMIN hoặc ADMIN đầu tiên
                emailTo = userRepository.findAll().stream()
                        .filter(u -> u.getEmail() != null && !u.getEmail().isBlank())
                        .filter(u -> u.getRoles() != null && u.getRoles().stream().anyMatch(r ->
                                "SUPER_ADMIN".equalsIgnoreCase(r.getName()) || "ADMIN".equalsIgnoreCase(r.getName())))
                        .map(User::getEmail)
                        .findFirst()
                        .orElse("computerduylong@gmail.com");
            }

            emailService.sendDailySnapshotNotificationEmail(emailTo, date, recordCount, totalQty, totalVal, isSuccess, errorDetails);
            log.info("[DailyInventorySnapshotJob] Đã gửi thông báo snapshot ngày {} về email: {}", date, emailTo);
        } catch (Exception ex) {
            log.warn("[DailyInventorySnapshotJob] Không thể gửi email thông báo snapshot: {}", ex.getMessage());
        }
    }
}
