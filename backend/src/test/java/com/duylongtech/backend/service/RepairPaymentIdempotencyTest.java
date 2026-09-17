package com.duylongtech.backend.service;

import com.duylongtech.backend.feature.partner.*;
import com.duylongtech.backend.feature.payment.*;
import com.duylongtech.backend.feature.system.CodeGeneratorService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RepairPaymentIdempotencyTest {
    @Mock PaymentTransactionRepository paymentRepository;
    @Mock PartnerRepository partnerRepository;
    @Mock PartnerLedgerRepository ledgerRepository;
    @Mock PartnerLedgerService ledgerService;
    @Mock CodeGeneratorService codeGeneratorService;
    @InjectMocks PaymentService paymentService;

    @Test
    void retryWithSameKeyReturnsExistingRepairReceipt() {
        PaymentTransaction existing = new PaymentTransaction();
        existing.initTransaction("PT00001", "RECEIPT", 5L, new BigDecimal("150000"),
                "DRAFT", "CASH", "Thu tiền sửa chữa");
        existing.linkReference("REPAIR", 9L, "repair-9-receipt", 3L);
        Partner partner = new Partner();
        partner.setId(5L);
        partner.setName("Khách A");

        when(paymentRepository.findByIdempotencyKey("repair-9-receipt")).thenReturn(Optional.of(existing));
        when(partnerRepository.findById(5L)).thenReturn(Optional.of(partner));
        when(ledgerRepository.findTopByPartnerIdOrderByIdDesc(5L)).thenReturn(Optional.empty());

        PaymentResponse response = paymentService.createRepairReceipt(9L, 5L, new BigDecimal("150000"),
                "CASH", "repair-9-receipt", 3L);

        assertEquals("PT00001", response.getCode());
        assertEquals(9L, response.getReferenceId());
        verify(paymentRepository, never()).save(any());
    }
}
