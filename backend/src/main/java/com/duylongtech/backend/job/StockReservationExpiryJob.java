package com.duylongtech.backend.job;

import com.duylongtech.backend.entity.StockReservation;
import com.duylongtech.backend.repository.InventoryBalanceRepository;
import com.duylongtech.backend.repository.SalesOrderRepository;
import com.duylongtech.backend.repository.StockReservationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class StockReservationExpiryJob {

    private final StockReservationRepository stockReservationRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final SalesOrderRepository salesOrderRepository;

    /**
     * Chạy mỗi giờ để tìm các reservation HOLDING đã hết hạn và release chúng.
     * Nếu tất cả reservations của một SO đều bị release → SO.status = CANCELLED.
     */
    @Scheduled(fixedRate = 3_600_000) // 1 giờ
    @Transactional
    public void releaseExpiredReservations() {
        List<StockReservation> expired = stockReservationRepository.findExpiredHolding(LocalDateTime.now());

        if (expired.isEmpty()) {
            return;
        }

        log.info("[ReservationExpiryJob] Tìm thấy {} reservation hết hạn. Bắt đầu release...", expired.size());

        for (StockReservation r : expired) {
            // Giảm quantity_reserved trong INVENTORY_BALANCES
            inventoryBalanceRepository
                    .findByWarehouseAndVariant(r.getWarehouseId(), r.getVariantId(), "GOOD")
                    .ifPresent(balance -> {
                        BigDecimal newReserved = balance.getQuantityReserved().subtract(r.getQuantityReserved());
                        balance.setQuantityReserved(newReserved.max(BigDecimal.ZERO));
                        inventoryBalanceRepository.save(balance);
                    });

            r.setStatus("RELEASED");
            stockReservationRepository.save(r);
        }

        // Với mỗi SO có reservation bị release, kiểm tra xem tất cả đã release chưa
        Map<Long, List<StockReservation>> bySo = expired.stream()
                .collect(Collectors.groupingBy(StockReservation::getSalesOrderId));

        for (Long soId : bySo.keySet()) {
            List<StockReservation> allSoReservations = stockReservationRepository.findBySalesOrderId(soId);
            boolean allReleased = allSoReservations.stream()
                    .allMatch(r -> "RELEASED".equals(r.getStatus()) || "FULFILLED".equals(r.getStatus()));
            boolean hasAnyHolding = allSoReservations.stream()
                    .anyMatch(r -> "HOLDING".equals(r.getStatus()));

            if (allReleased && !hasAnyHolding) {
                salesOrderRepository.findById(soId).ifPresent(so -> {
                    if ("APPROVED".equals(so.getStatus())) {
                        so.setStatus("CANCELLED");
                        salesOrderRepository.save(so);
                        log.info("[ReservationExpiryJob] SO {} tự động hủy do reservation hết hạn", so.getSoCode());
                    }
                });
            }
        }

        log.info("[ReservationExpiryJob] Hoàn thành release {} reservation hết hạn.", expired.size());
    }
}
