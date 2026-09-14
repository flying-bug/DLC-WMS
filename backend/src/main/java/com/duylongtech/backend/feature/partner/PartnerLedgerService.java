package com.duylongtech.backend.feature.partner;

import com.duylongtech.backend.feature.partner.PartnerLedger;
import com.duylongtech.backend.feature.partner.PartnerLedgerRepository;
import com.duylongtech.backend.feature.partner.PartnerLedgerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
public class PartnerLedgerService {

    private final PartnerLedgerRepository partnerLedgerRepository;
    @Transactional
    public PartnerLedger recordLedger(Long partnerId, String entityType, Long entityId, 
                                       String referenceCode, BigDecimal amountDebt, 
                                       BigDecimal amountReceipt, String note) {
        if (partnerId == null) {
            log.warn("[PartnerLedger] Bỏ qua ghi nhận công nợ do partnerId null. RefCode={}", referenceCode);
            return null;
        }

        BigDecimal safeDebt = amountDebt != null ? amountDebt : BigDecimal.ZERO;
        BigDecimal safeReceipt = amountReceipt != null ? amountReceipt : BigDecimal.ZERO;

        BigDecimal prevBalance = partnerLedgerRepository.findTopByPartnerIdOrderByIdDesc(partnerId)
                .map(PartnerLedger::getBalanceAfter)
                .orElse(BigDecimal.ZERO);

        BigDecimal balanceAfter = prevBalance.add(safeDebt).subtract(safeReceipt);

        PartnerLedger ledger = new PartnerLedger();
        ledger.initEntry(partnerId, entityType, entityId, referenceCode, safeDebt, safeReceipt, balanceAfter, note);

        PartnerLedger saved = partnerLedgerRepository.save(ledger);
        log.info("[PartnerLedger] Ghi nhận công nợ cho PartnerID {}. Loại={}. Mã={}. Dư nợ mới={}", 
                partnerId, entityType, referenceCode, balanceAfter);

        return saved;
    }

    /**
     * Hoàn tác đúng số tiền của lần ghi công nợ gần nhất cho 1 chứng từ cụ thể (vd. bỏ ghi
     * sổ phiếu xuất/nhập sau khi đã ghi công nợ lúc post). Tìm dòng sổ cái gần nhất khớp
     * (entityType, entityId) rồi đảo ngược đúng amountDebt/amountReceipt của chính nó - an
     * toàn hơn tính lại từ đầu (không lệch nếu dữ liệu chứng từ đã đổi giữa lúc post và
     * unpost), và tự động đúng cho cả trường hợp 1 chứng từ được post/unpost nhiều lần vì
     * luôn chỉ đảo ngược lần post gần nhất. Không làm gì nếu không tìm thấy dòng gốc (vd.
     * chứng từ không gắn partner khi post).
     */
    @Transactional
    public void reverseLedger(String entityType, Long entityId, String reverseEntityType, String referenceCode, String note) {
        partnerLedgerRepository.findTopByEntityTypeAndEntityIdOrderByIdDesc(entityType, entityId)
                .ifPresent(original -> recordLedger(
                        original.getPartnerId(),
                        reverseEntityType,
                        entityId,
                        referenceCode,
                        original.getAmountReceipt(),
                        original.getAmountDebt(),
                        note
                ));
    }
}
