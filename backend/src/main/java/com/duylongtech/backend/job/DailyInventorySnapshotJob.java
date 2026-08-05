package com.duylongtech.backend.job;

import com.duylongtech.backend.repository.InventoryDailySnapshotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class DailyInventorySnapshotJob {

    private final InventoryDailySnapshotRepository snapshotRepository;

    /**
     * Tự động chốt sổ kho hàng ngày lúc 00:05 mỗi đêm cho ngày hôm trước.
     */
    @Scheduled(cron = "0 5 0 * * ?")
    @Transactional
    public void runDailySnapshot() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        log.info("[DailyInventorySnapshotJob] Bắt đầu tự động chốt sổ kho ngày {}", yesterday);
        snapshotDate(yesterday);
        log.info("[DailyInventorySnapshotJob] Tự động chốt sổ kho ngày {} hoàn tất.", yesterday);
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
        } catch (Exception e) {
            log.error("[DailyInventorySnapshotJob] Lỗi khi tạo snapshot cho ngày {}: {}", date, e.getMessage(), e);
        }
    }
}
