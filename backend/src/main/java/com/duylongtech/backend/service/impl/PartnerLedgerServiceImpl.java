package com.duylongtech.backend.service.impl;

import com.duylongtech.backend.entity.PartnerLedger;
import com.duylongtech.backend.repository.PartnerLedgerRepository;
import com.duylongtech.backend.service.PartnerLedgerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
public class PartnerLedgerServiceImpl implements PartnerLedgerService {

    private final PartnerLedgerRepository partnerLedgerRepository;

    @Override
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

        PartnerLedger ledger = PartnerLedger.builder()
                .partnerId(partnerId)
                .entityType(entityType)
                .entityId(entityId)
                .referenceCode(referenceCode)
                .amountDebt(safeDebt)
                .amountReceipt(safeReceipt)
                .balanceAfter(balanceAfter)
                .note(note)
                .build();

        PartnerLedger saved = partnerLedgerRepository.save(ledger);
        log.info("[PartnerLedger] Ghi nhận công nợ cho PartnerID {}. Loại={}. Mã={}. Dư nợ mới={}", 
                partnerId, entityType, referenceCode, balanceAfter);

        return saved;
    }
}
