package com.duylongtech.backend.job;

import com.duylongtech.backend.entity.PurchaseOrder;
import com.duylongtech.backend.entity.PurchaseOrderLine;
import com.duylongtech.backend.repository.AppNotificationRepository;
import com.duylongtech.backend.repository.InventoryDocumentLineRepository;
import com.duylongtech.backend.repository.PurchaseOrderRepository;
import com.duylongtech.backend.service.AppNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class PurchaseOrderReminderJob {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final InventoryDocumentLineRepository inventoryDocumentLineRepository;
    private final AppNotificationRepository appNotificationRepository;
    private final AppNotificationService appNotificationService;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DecimalFormat MONEY_FMT = new DecimalFormat("#,##0");

    private static final List<String> DEBT_ROLES = List.of("ROLE_ACCOUNTANT", "ROLE_MANAGER", "ROLE_SUPER_ADMIN");
    private static final List<String> DELIVERY_ROLES = List.of("ROLE_WAREHOUSE", "ROLE_STAFF", "ROLE_MANAGER", "ROLE_SUPER_ADMIN");

    /**
     * Chạy định kỳ lúc 08:00 mỗi sáng và sau khi khởi động hệ thống.
     */
    @Scheduled(cron = "0 0 8 * * ?")
    @Scheduled(initialDelay = 15000, fixedDelay = 1800000) // Khởi động sau 15s, quét lại mỗi 30 phút
    @Transactional
    public void runPurchaseOrderReminders() {
        log.info("[PurchaseOrderReminderJob] Bắt đầu quét kiểm tra hạn công nợ và ngày giao dự kiến...");
        LocalDate today = LocalDate.now();
        LocalDateTime todayStart = today.atStartOfDay();

        List<PurchaseOrder> activeOrders = purchaseOrderRepository.findActiveOrdersForReminder();
        if (activeOrders == null || activeOrders.isEmpty()) {
            log.info("[PurchaseOrderReminderJob] Không có đơn mua hàng nào đang hoạt động cần kiểm tra.");
            return;
        }

        int debtNotifCount = 0;
        int deliveryNotifCount = 0;

        for (PurchaseOrder po : activeOrders) {
            try {
                // 1. Kiểm tra Hạn công nợ
                debtNotifCount += checkDebtDueDate(po, today, todayStart);

                // 2. Kiểm tra Ngày giao hàng dự kiến
                deliveryNotifCount += checkDeliveryDueDate(po, today, todayStart);
            } catch (Exception ex) {
                log.error("[PurchaseOrderReminderJob] Lỗi khi xử lý thông báo cho PO {}: {}", po.getPoCode(), ex.getMessage());
            }
        }

        log.info("[PurchaseOrderReminderJob] Hoàn thành quét PO. Đã phát {} thông báo công nợ, {} thông báo giao hàng.",
                debtNotifCount, deliveryNotifCount);
    }

    private int checkDebtDueDate(PurchaseOrder po, LocalDate today, LocalDateTime todayStart) {
        if (po.getPaymentDueDate() == null) {
            return 0;
        }

        // Đã thanh toán đầy đủ thì bỏ qua
        if ("PAID".equalsIgnoreCase(po.getPaymentStatus())) {
            return 0;
        }

        BigDecimal total = po.getTotalAmount() != null ? po.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal paid = po.getPaidAmount() != null ? po.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal remaining = total.subtract(paid);
        if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
            return 0;
        }

        LocalDate dueDate = po.getPaymentDueDate();
        String supplierName = po.getPartner() != null ? po.getPartner().getName() : ("NCC #" + po.getPartnerId());
        String moneyStr = MONEY_FMT.format(remaining) + " đ";
        String dueDateStr = dueDate.format(DATE_FMT);
        String poLink = "/purchase-orders/" + po.getId();

        int sent = 0;

        // Trường hợp 1: Đã quá hạn công nợ
        if (dueDate.isBefore(today)) {
            String refType = "PO_PAYMENT_OVERDUE";
            String title = "⚠️ Đơn mua " + po.getPoCode() + " đã quá hạn công nợ";
            String message = String.format("Đơn mua %s của NCC \"%s\" đã quá hạn thanh toán từ ngày %s. Số tiền còn nợ: %s.",
                    po.getPoCode(), supplierName, dueDateStr, moneyStr);

            for (String role : DEBT_ROLES) {
                if (!appNotificationRepository.existsRecentNotification(refType, po.getId(), role, todayStart)) {
                    appNotificationService.createNotification(role, null, title, message,
                            "DISCREPANCY", refType, po.getId(), poLink);
                    sent++;
                }
            }
        }
        // Trường hợp 2: Sắp đến hạn công nợ (trong vòng 3 ngày tới, bao gồm cả hôm nay)
        else if (!dueDate.isAfter(today.plusDays(3))) {
            String refType = "PO_PAYMENT_UPCOMING";
            String daysNote = dueDate.isEqual(today) ? "hôm nay" : ("ngày " + dueDateStr);
            String title = "⏰ Đơn mua " + po.getPoCode() + " sắp đến hạn công nợ (" + daysNote + ")";
            String message = String.format("Đơn mua %s của NCC \"%s\" sẽ đến hạn thanh toán vào %s. Số tiền cần chi trả: %s.",
                    po.getPoCode(), supplierName, daysNote, moneyStr);

            for (String role : DEBT_ROLES) {
                if (!appNotificationRepository.existsRecentNotification(refType, po.getId(), role, todayStart)) {
                    appNotificationService.createNotification(role, null, title, message,
                            "ORDER", refType, po.getId(), poLink);
                    sent++;
                }
            }
        }

        return sent;
    }

    private int checkDeliveryDueDate(PurchaseOrder po, LocalDate today, LocalDateTime todayStart) {
        if (po.getExpectedDeliveryDate() == null) {
            return 0;
        }

        // Kiểm tra xem đơn đã nhập kho đủ chưa
        boolean isFullyImported = checkIfFullyImported(po);
        if (isFullyImported) {
            return 0;
        }

        LocalDate deliveryDate = po.getExpectedDeliveryDate();
        String supplierName = po.getPartner() != null ? po.getPartner().getName() : ("NCC #" + po.getPartnerId());
        String deliveryDateStr = deliveryDate.format(DATE_FMT);
        String poLink = "/purchase-orders/" + po.getId();

        int sent = 0;

        // Trường hợp 1: Quá hạn ngày giao dự kiến mà chưa nhập đủ
        if (deliveryDate.isBefore(today)) {
            String refType = "PO_DELIVERY_OVERDUE";
            String title = "🚚 Đơn mua " + po.getPoCode() + " trễ hạn giao hàng dự kiến";
            String message = String.format("Đơn mua %s từ NCC \"%s\" có ngày giao dự kiến là %s nhưng hiện tại kho vẫn chưa hoàn tất nhập hàng.",
                    po.getPoCode(), supplierName, deliveryDateStr);

            for (String role : DELIVERY_ROLES) {
                if (!appNotificationRepository.existsRecentNotification(refType, po.getId(), role, todayStart)) {
                    appNotificationService.createNotification(role, null, title, message,
                            "DISCREPANCY", refType, po.getId(), poLink);
                    sent++;
                }
            }
        }
        // Trường hợp 2: Có lịch giao hàng hôm nay hoặc ngày mai
        else if (!deliveryDate.isAfter(today.plusDays(1))) {
            String refType = "PO_DELIVERY_UPCOMING";
            String timeNote = deliveryDate.isEqual(today) ? "hôm nay (" + deliveryDateStr + ")" : "ngày mai (" + deliveryDateStr + ")";
            String title = "📦 Đơn mua " + po.getPoCode() + " dự kiến giao hàng " + timeNote;
            String message = String.format("Đơn mua %s từ NCC \"%s\" dự kiến sẽ giao đến kho vào %s. Vui lòng bố trí nhân sự và vị trí tiếp nhận hàng.",
                    po.getPoCode(), supplierName, timeNote);

            for (String role : DELIVERY_ROLES) {
                if (!appNotificationRepository.existsRecentNotification(refType, po.getId(), role, todayStart)) {
                    appNotificationService.createNotification(role, null, title, message,
                            "ORDER", refType, po.getId(), poLink);
                    sent++;
                }
            }
        }

        return sent;
    }

    private boolean checkIfFullyImported(PurchaseOrder po) {
        if (po.getLines() == null || po.getLines().isEmpty()) {
            return false;
        }

        for (PurchaseOrderLine line : po.getLines()) {
            BigDecimal ordered = line.getQuantity() != null ? line.getQuantity() : BigDecimal.ZERO;
            BigDecimal imported = inventoryDocumentLineRepository
                    .sumImportedQuantityByPurchaseOrderIdAndVariantId(po.getId(), line.getVariantId());
            if (imported == null) {
                imported = BigDecimal.ZERO;
            }
            if (ordered.subtract(imported).compareTo(BigDecimal.ZERO) > 0) {
                return false; // Còn mặt hàng chưa nhập đủ
            }
        }
        return true;
    }
}
