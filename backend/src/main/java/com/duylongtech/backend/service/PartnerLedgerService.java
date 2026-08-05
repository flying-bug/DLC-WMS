package com.duylongtech.backend.service;

import com.duylongtech.backend.entity.PartnerLedger;

import java.math.BigDecimal;

public interface PartnerLedgerService {

    PartnerLedger recordLedger(Long partnerId, String entityType, Long entityId, 
                               String referenceCode, BigDecimal amountDebt, 
                               BigDecimal amountReceipt, String note);
}
