package com.duylongtech.backend.feature.partner;

import com.duylongtech.backend.feature.partner.PartnerLedger;

import java.math.BigDecimal;

public interface PartnerLedgerService {

    PartnerLedger recordLedger(Long partnerId, String entityType, Long entityId, 
                               String referenceCode, BigDecimal amountDebt, 
                               BigDecimal amountReceipt, String note);
}
