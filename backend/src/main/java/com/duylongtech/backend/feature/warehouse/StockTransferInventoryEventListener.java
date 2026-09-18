package com.duylongtech.backend.feature.warehouse;

import com.duylongtech.backend.feature.inventory.InventoryDocumentPostedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Nối 2 nửa của một phiếu chuyển kho: khi phiếu xuất kho (kho A) tự động sinh cho
 * phiếu chuyển được ghi sổ, tạo tiếp phiếu nhập kho nháp (kho B) với đúng số lượng
 * đã thực xuất; khi phiếu nhập đó được ghi sổ, đánh dấu phiếu chuyển hoàn tất.
 *
 * AFTER_COMMIT + REQUIRES_NEW: chạy sau khi giao dịch ghi sổ gốc đã commit, trong
 * giao dịch riêng - lỗi ở đây (vd tạo phiếu nhập thất bại) không được phép làm
 * rollback việc ghi sổ xuất/nhập kho đã xảy ra. Mô phỏng đúng
 * feature/repair/InventoryDocumentPostedEventListener.java.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StockTransferInventoryEventListener {

    private static final String REFERENCE_TYPE = "STOCK_TRANSFER";

    private final StockTransferService stockTransferService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleInventoryDocumentPosted(InventoryDocumentPostedEvent event) {
        if (!REFERENCE_TYPE.equalsIgnoreCase(event.getReferenceType()) || event.getReferenceId() == null) {
            return;
        }

        try {
            stockTransferService.handleLinkedDocumentPosted(event.getReferenceId(), event.getDocumentId());
        } catch (Exception e) {
            log.error("[StockTransfer {}] Failed to process posted document {}", event.getReferenceId(), event.getDocumentId(), e);
        }
    }
}
