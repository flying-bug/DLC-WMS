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
}
