package com.duylongtech.backend.job;

import com.duylongtech.backend.repository.WarrantyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class WarrantyExpirationJob {

    private final WarrantyRepository warrantyRepository;

    @Scheduled(cron = "0 0 0 * * ?") // Runs every day at 00:00:00
    @Transactional
    public void expireOutdatedWarranties() {
        log.info("Bắt đầu job cập nhật phiếu bảo hành hết hạn...");
        int updatedCount = warrantyRepository.expireOutdatedWarranties();
        log.info("Đã cập nhật trạng thái EXPIRED cho {} phiếu bảo hành.", updatedCount);
    }
}
