package com.duylongtech.backend.job;

import com.duylongtech.backend.enums.DocumentStatus;
import com.duylongtech.backend.enums.StockReservationStatus;

import com.duylongtech.backend.feature.inventory.StockReservation;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrder;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.inventory.StockReservationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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

        // Gộp số lượng cần giảm theo từng (warehouse, variant) - 1 câu UPDATE mỗi cặp
        // thay vì đọc rồi ghi INVENTORY_BALANCES cho từng reservation.
        Map<String, BigDecimal> reservedToReleaseByBalanceKey = new HashMap<>();
        for (StockReservation r : expired) {
            String key = r.getWarehouseId() + ":" + r.getVariantId();
            reservedToReleaseByBalanceKey.merge(key, r.getQuantityReserved(), BigDecimal::add);
        }
        for (StockReservation r : expired) {
            String key = r.getWarehouseId() + ":" + r.getVariantId();
            BigDecimal amount = reservedToReleaseByBalanceKey.remove(key);
            if (amount != null) {
                inventoryBalanceRepository.decrementReservedQuantity(r.getWarehouseId(), r.getVariantId(), amount);
            }
        }

        // Bulk release toàn bộ reservation hết hạn trong 1 câu UPDATE thay vì N lần save().
        List<Long> expiredIds = expired.stream().map(StockReservation::getId).collect(Collectors.toList());
        stockReservationRepository.updateStatusByIdIn(expiredIds, StockReservationStatus.RELEASED.name());

        // Với mỗi SO có reservation bị release, kiểm tra xem tất cả đã release/fulfilled
        // chưa - fetch 1 lần cho toàn bộ danh sách SO thay vì 1 query mỗi SO.
        List<Long> soIds = expired.stream()
                .map(StockReservation::getSalesOrderId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        Map<Long, List<StockReservation>> reservationsBySo = stockReservationRepository.findBySalesOrderIdIn(soIds)
                .stream()
                .collect(Collectors.groupingBy(StockReservation::getSalesOrderId));

        List<Long> soIdsToCancel = new ArrayList<>();
        for (Long soId : soIds) {
            List<StockReservation> allSoReservations = reservationsBySo.getOrDefault(soId, List.of());
            boolean allReleased = !allSoReservations.isEmpty() && allSoReservations.stream()
                    .allMatch(r -> StockReservationStatus.RELEASED.name().equals(r.getStatus()) || StockReservationStatus.FULFILLED.name().equals(r.getStatus()));
            boolean hasAnyHolding = allSoReservations.stream()
                    .anyMatch(r -> StockReservationStatus.HOLDING.name().equals(r.getStatus()));
            if (allReleased && !hasAnyHolding) {
                soIdsToCancel.add(soId);
            }
        }

        if (!soIdsToCancel.isEmpty()) {
            List<SalesOrder> cancelled = new ArrayList<>();
            for (SalesOrder so : salesOrderRepository.findAllById(soIdsToCancel)) {
                if (DocumentStatus.APPROVED.name().equals(so.getStatus())) {
                    so.cancel();
                    cancelled.add(so);
                }
            }
            if (!cancelled.isEmpty()) {
                salesOrderRepository.saveAll(cancelled);
                cancelled.forEach(so -> log.info("[ReservationExpiryJob] SO {} tự động hủy do reservation hết hạn", so.getSoCode()));
            }
        }

        log.info("[ReservationExpiryJob] Hoàn thành release {} reservation hết hạn.", expired.size());
    }
}
