package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.PaymentRequest;
import com.duylongtech.backend.dto.response.PaymentResponse;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.entity.PartnerLedger;
import com.duylongtech.backend.entity.PaymentTransaction;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.PartnerLedgerRepository;
import com.duylongtech.backend.repository.PartnerRepository;
import com.duylongtech.backend.repository.PaymentTransactionRepository;
import com.duylongtech.backend.service.impl.PaymentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {

    private static final Long PARTNER_ID = 10L;

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;
    @Mock
    private PartnerRepository partnerRepository;
    @Mock
    private PartnerLedgerRepository partnerLedgerRepository;
    @Mock
    private PartnerLedgerService partnerLedgerService;
    @Mock
    private CodeGeneratorService codeGeneratorService;

    private PaymentServiceImpl paymentService;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentServiceImpl(
                paymentTransactionRepository,
                partnerRepository,
                partnerLedgerRepository,
                partnerLedgerService,
                codeGeneratorService
        );
    }

    @Test
    void createPaymentReceipt_nullRequest_throwsBusinessException() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> paymentService.createPaymentReceipt(null)
        );

        assertEquals("Đối tác là bắt buộc", exception.getMessage());
        verifyNoInteractions(
                paymentTransactionRepository,
                partnerRepository,
                partnerLedgerRepository,
                partnerLedgerService,
                codeGeneratorService
        );
    }

    @Test
    void createPaymentReceipt_missingPartnerId_throwsBusinessException() {
        PaymentRequest request = paymentRequest(null, "100.00", "CASH", "POSTED", null);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> paymentService.createPaymentReceipt(request)
        );

        assertEquals("Đối tác là bắt buộc", exception.getMessage());
        verifyNoInteractions(
                paymentTransactionRepository,
                partnerRepository,
                partnerLedgerRepository,
                partnerLedgerService,
                codeGeneratorService
        );
    }

    @Test
    void createPaymentReceipt_partnerDoesNotExist_throwsBusinessException() {
        PaymentRequest request = paymentRequest(PARTNER_ID, "100.00", "CASH", "POSTED", null);
        when(partnerRepository.findById(PARTNER_ID)).thenReturn(Optional.empty());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> paymentService.createPaymentReceipt(request)
        );

        assertEquals("Không tìm thấy đối tác với ID: 10", exception.getMessage());
        verify(paymentTransactionRepository, never()).save(any());
        verifyNoInteractions(partnerLedgerRepository, partnerLedgerService, codeGeneratorService);
    }

    @ParameterizedTest(name = "amount={0}")
    @MethodSource("nonPositiveAmounts")
    void createPaymentReceipt_nonPositiveAmount_throwsBusinessException(BigDecimal amount) {
        PaymentRequest request = paymentRequest(PARTNER_ID, null, "CASH", "POSTED", null);
        request.setAmount(amount);
        when(partnerRepository.findById(PARTNER_ID)).thenReturn(Optional.of(partner()));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> paymentService.createPaymentReceipt(request)
        );

        assertEquals("Số tiền giao dịch phải lớn hơn 0", exception.getMessage());
        verify(paymentTransactionRepository, never()).save(any());
        verifyNoInteractions(partnerLedgerRepository, partnerLedgerService, codeGeneratorService);
    }

    @Test
    void createPaymentReceipt_invalidStatus_throwsBusinessException() {
        PaymentRequest request = paymentRequest(PARTNER_ID, "100.00", "CASH", "APPROVED", null);
        when(partnerRepository.findById(PARTNER_ID)).thenReturn(Optional.of(partner()));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> paymentService.createPaymentReceipt(request)
        );

        assertEquals("Trạng thái phiếu thu/chi chỉ chấp nhận DRAFT hoặc POSTED", exception.getMessage());
        verify(paymentTransactionRepository, never()).save(any());
        verifyNoInteractions(partnerLedgerRepository, partnerLedgerService, codeGeneratorService);
    }

    @Test
    void createPaymentReceipt_invalidPaymentMethod_throwsBusinessException() {
        PaymentRequest request = paymentRequest(PARTNER_ID, "100.00", "CARD", "DRAFT", null);
        when(partnerRepository.findById(PARTNER_ID)).thenReturn(Optional.of(partner()));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> paymentService.createPaymentReceipt(request)
        );

        assertEquals("Phương thức thanh toán chỉ chấp nhận CASH hoặc BANK_TRANSFER", exception.getMessage());
        verify(paymentTransactionRepository, never()).save(any());
        verifyNoInteractions(partnerLedgerRepository, partnerLedgerService, codeGeneratorService);
    }

    @Test
    void createPaymentReceipt_defaultPostedAndCash_recordsReceiptLedger() {
        PaymentRequest request = paymentRequest(PARTNER_ID, "200.00", null, null, "   ");
        Partner partner = partner();
        when(partnerRepository.findById(PARTNER_ID)).thenReturn(Optional.of(partner));
        when(partnerLedgerRepository.findTopByPartnerIdOrderByIdDesc(PARTNER_ID))
                .thenReturn(Optional.of(ledger("200.00")), Optional.of(ledger("0.00")));
        when(codeGeneratorService.generateCode("PAYMENT_TRANSACTIONS", "transaction_code", "PT", 5))
                .thenReturn("PT00001");
        when(paymentTransactionRepository.save(any(PaymentTransaction.class)))
                .thenAnswer(invocation -> withId(invocation.getArgument(0), 101L));

        PaymentResponse response = paymentService.createPaymentReceipt(request);

        ArgumentCaptor<PaymentTransaction> transactionCaptor = ArgumentCaptor.forClass(PaymentTransaction.class);
        verify(paymentTransactionRepository).save(transactionCaptor.capture());
        PaymentTransaction saved = transactionCaptor.getValue();
        assertAll(
                () -> assertEquals("PT00001", saved.getTransactionCode()),
                () -> assertEquals("RECEIPT", saved.getType()),
                () -> assertEquals(PARTNER_ID, saved.getPartnerId()),
                () -> assertEquals(new BigDecimal("200.00"), saved.getAmount()),
                () -> assertEquals("POSTED", saved.getStatus()),
                () -> assertEquals("CASH", saved.getPaymentMethod()),
                () -> assertNull(saved.getNote()),
                () -> assertNotNull(saved.getCreatedAt()),
                () -> assertEquals(101L, response.getId()),
                () -> assertEquals("Công ty Minh Long", response.getPartnerName()),
                () -> assertEquals(BigDecimal.ZERO.setScale(2), response.getPartnerDebtBalance())
        );
        verify(partnerLedgerService).recordLedger(
                PARTNER_ID,
                "PAYMENT_RECEIPT",
                101L,
                "PT00001",
                BigDecimal.ZERO,
                new BigDecimal("200.00"),
                "Lập phiếu thu tiền PT00001"
        );
    }

    @Test
    void createPaymentReceipt_draftNormalizesInputAndDoesNotRecordLedger() {
        PaymentRequest request = paymentRequest(
                PARTNER_ID,
                "150.00",
                " bank_transfer ",
                " draft ",
                "  Thanh toán đợt 1  "
        );
        when(partnerRepository.findById(PARTNER_ID)).thenReturn(Optional.of(partner()));
        when(codeGeneratorService.generateCode("PAYMENT_TRANSACTIONS", "transaction_code", "PT", 5))
                .thenReturn("PT00002");
        when(paymentTransactionRepository.save(any(PaymentTransaction.class)))
                .thenAnswer(invocation -> withId(invocation.getArgument(0), 102L));
        when(partnerLedgerRepository.findTopByPartnerIdOrderByIdDesc(PARTNER_ID))
                .thenReturn(Optional.of(ledger("500.00")));

        PaymentResponse response = paymentService.createPaymentReceipt(request);

        assertAll(
                () -> assertEquals("DRAFT", response.getStatus()),
                () -> assertEquals("BANK_TRANSFER", response.getPaymentMethod()),
                () -> assertEquals("Thanh toán đợt 1", response.getNote()),
                () -> assertEquals(new BigDecimal("500.00"), response.getPartnerDebtBalance())
        );
        verify(partnerLedgerService, never()).recordLedger(any(), any(), any(), any(), any(), any(), any());
        verify(partnerLedgerRepository).findTopByPartnerIdOrderByIdDesc(PARTNER_ID);
    }

    @Test
    void createPaymentReceipt_amountExceedsDebt_throwsBusinessException() {
        PaymentRequest request = paymentRequest(PARTNER_ID, "200.01", "CASH", "POSTED", null);
        when(partnerRepository.findById(PARTNER_ID)).thenReturn(Optional.of(partner()));
        when(partnerLedgerRepository.findTopByPartnerIdOrderByIdDesc(PARTNER_ID))
                .thenReturn(Optional.of(ledger("200.00")));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> paymentService.createPaymentReceipt(request)
        );

        assertEquals("Số tiền thu/chi không được vượt quá số công nợ hiện tại", exception.getMessage());
        verify(paymentTransactionRepository, never()).save(any());
        verifyNoInteractions(partnerLedgerService, codeGeneratorService);
    }

    @Test
    void createPaymentVoucher_postedAtDebtBoundary_recordsVoucherLedger() {
        PaymentRequest request = paymentRequest(PARTNER_ID, "300.00", "CASH", "POSTED", "Chi nhà cung cấp");
        when(partnerRepository.findById(PARTNER_ID)).thenReturn(Optional.of(partner()));
        when(partnerLedgerRepository.findTopByPartnerIdOrderByIdDesc(PARTNER_ID))
                .thenReturn(Optional.of(ledger("300.00")), Optional.of(ledger("0.00")));
        when(codeGeneratorService.generateCode("PAYMENT_TRANSACTIONS", "transaction_code", "PC", 5))
                .thenReturn("PC00001");
        when(paymentTransactionRepository.save(any(PaymentTransaction.class)))
                .thenAnswer(invocation -> withId(invocation.getArgument(0), 201L));

        PaymentResponse response = paymentService.createPaymentVoucher(request);

        assertAll(
                () -> assertEquals("PC00001", response.getCode()),
                () -> assertEquals("VOUCHER", response.getType()),
                () -> assertEquals("POSTED", response.getStatus()),
                () -> assertEquals("Chi nhà cung cấp", response.getNote())
        );
        verify(partnerLedgerService).recordLedger(
                PARTNER_ID,
                "PAYMENT_VOUCHER",
                201L,
                "PC00001",
                BigDecimal.ZERO,
                new BigDecimal("300.00"),
                "Chi nhà cung cấp"
        );
    }

    @Test
    void createPaymentVoucher_amountExceedsDebt_throwsBusinessException() {
        PaymentRequest request = paymentRequest(PARTNER_ID, "300.01", "CASH", "POSTED", null);
        when(partnerRepository.findById(PARTNER_ID)).thenReturn(Optional.of(partner()));
        when(partnerLedgerRepository.findTopByPartnerIdOrderByIdDesc(PARTNER_ID))
                .thenReturn(Optional.of(ledger("300.00")));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> paymentService.createPaymentVoucher(request)
        );

        assertEquals("Số tiền thu/chi không được vượt quá số công nợ hiện tại", exception.getMessage());
        verify(paymentTransactionRepository, never()).save(any());
        verifyNoInteractions(partnerLedgerService, codeGeneratorService);
    }

    @Test
    void postPayment_paymentDoesNotExist_throwsBusinessException() {
        when(paymentTransactionRepository.findById(999L)).thenReturn(Optional.empty());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> paymentService.postPayment(999L)
        );

        assertEquals("Không tìm thấy phiếu thu/chi", exception.getMessage());
        verifyNoInteractions(partnerRepository, partnerLedgerRepository, partnerLedgerService, codeGeneratorService);
    }

    @Test
    void postPayment_partnerDoesNotExist_throwsBusinessException() {
        PaymentTransaction payment = transaction(301L, "PT00003", "RECEIPT", "DRAFT", "100.00");
        when(paymentTransactionRepository.findById(301L)).thenReturn(Optional.of(payment));
        when(partnerRepository.findById(PARTNER_ID)).thenReturn(Optional.empty());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> paymentService.postPayment(301L)
        );

        assertEquals("Không tìm thấy đối tác", exception.getMessage());
        verify(paymentTransactionRepository, never()).save(any());
        verifyNoInteractions(partnerLedgerRepository, partnerLedgerService, codeGeneratorService);
    }

    @Test
    void postPayment_alreadyPosted_returnsCurrentPaymentWithoutDuplicateLedger() {
        PaymentTransaction payment = transaction(302L, "PT00004", "RECEIPT", "POSTED", "100.00");
        when(paymentTransactionRepository.findById(302L)).thenReturn(Optional.of(payment));
        when(partnerRepository.findById(PARTNER_ID)).thenReturn(Optional.of(partner()));
        when(partnerLedgerRepository.findTopByPartnerIdOrderByIdDesc(PARTNER_ID))
                .thenReturn(Optional.of(ledger("400.00")));

        PaymentResponse response = paymentService.postPayment(302L);

        assertAll(
                () -> assertEquals(302L, response.getId()),
                () -> assertEquals("POSTED", response.getStatus()),
                () -> assertEquals(new BigDecimal("400.00"), response.getPartnerDebtBalance())
        );
        verify(paymentTransactionRepository, never()).save(any());
        verifyNoInteractions(partnerLedgerService, codeGeneratorService);
    }

    @Test
    void postPayment_nonDraftStatus_throwsBusinessException() {
        PaymentTransaction payment = transaction(303L, "PC00002", "VOUCHER", "CANCELLED", "100.00");
        when(paymentTransactionRepository.findById(303L)).thenReturn(Optional.of(payment));
        when(partnerRepository.findById(PARTNER_ID)).thenReturn(Optional.of(partner()));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> paymentService.postPayment(303L)
        );

        assertEquals("Chỉ có thể ghi sổ phiếu ở trạng thái DRAFT", exception.getMessage());
        verify(paymentTransactionRepository, never()).save(any());
        verifyNoInteractions(partnerLedgerRepository, partnerLedgerService, codeGeneratorService);
    }

    @Test
    void postPayment_amountExceedsDebt_throwsBusinessException() {
        PaymentTransaction payment = transaction(304L, "PC00003", "VOUCHER", "DRAFT", "500.01");
        when(paymentTransactionRepository.findById(304L)).thenReturn(Optional.of(payment));
        when(partnerRepository.findById(PARTNER_ID)).thenReturn(Optional.of(partner()));
        when(partnerLedgerRepository.findTopByPartnerIdOrderByIdDesc(PARTNER_ID))
                .thenReturn(Optional.of(ledger("500.00")));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> paymentService.postPayment(304L)
        );

        assertEquals("Số tiền thu/chi không được vượt quá số công nợ hiện tại", exception.getMessage());
        assertEquals("DRAFT", payment.getStatus());
        verify(paymentTransactionRepository, never()).save(any());
        verifyNoInteractions(partnerLedgerService, codeGeneratorService);
    }

    @Test
    void postPayment_draftAtDebtBoundary_postsAndRecordsLedger() {
        PaymentTransaction payment = transaction(305L, "PC00004", "VOUCHER", "DRAFT", "500.00");
        payment.setNote(null);
        when(paymentTransactionRepository.findById(305L)).thenReturn(Optional.of(payment));
        when(partnerRepository.findById(PARTNER_ID)).thenReturn(Optional.of(partner()));
        when(partnerLedgerRepository.findTopByPartnerIdOrderByIdDesc(PARTNER_ID))
                .thenReturn(Optional.of(ledger("500.00")), Optional.of(ledger("0.00")));
        when(paymentTransactionRepository.save(payment)).thenReturn(payment);

        PaymentResponse response = paymentService.postPayment(305L);

        assertAll(
                () -> assertEquals("POSTED", payment.getStatus()),
                () -> assertEquals("POSTED", response.getStatus()),
                () -> assertEquals(BigDecimal.ZERO.setScale(2), response.getPartnerDebtBalance())
        );
        verify(partnerLedgerService).recordLedger(
                PARTNER_ID,
                "PAYMENT_VOUCHER",
                305L,
                "PC00004",
                BigDecimal.ZERO,
                new BigDecimal("500.00"),
                "Lập phiếu chi tiền PC00004"
        );
        verifyNoInteractions(codeGeneratorService);
    }

    @Test
    void getPartnerDebtBalance_nullPartnerId_returnsZeroWithoutRepositoryCall() {
        BigDecimal balance = paymentService.getPartnerDebtBalance(null);

        assertEquals(BigDecimal.ZERO, balance);
        verifyNoInteractions(partnerLedgerRepository);
    }

    @Test
    void getPartnerDebtBalance_noLedger_returnsZero() {
        when(partnerLedgerRepository.findTopByPartnerIdOrderByIdDesc(PARTNER_ID))
                .thenReturn(Optional.empty());

        BigDecimal balance = paymentService.getPartnerDebtBalance(PARTNER_ID);

        assertEquals(BigDecimal.ZERO, balance);
    }

    @Test
    void getPartnerDebtBalance_latestLedgerExists_returnsBalanceAfter() {
        when(partnerLedgerRepository.findTopByPartnerIdOrderByIdDesc(PARTNER_ID))
                .thenReturn(Optional.of(ledger("725.50")));

        BigDecimal balance = paymentService.getPartnerDebtBalance(PARTNER_ID);

        assertEquals(new BigDecimal("725.50"), balance);
    }

    @Test
    void getPartnerPaymentHistory_partnerDoesNotExist_throwsBusinessException() {
        when(partnerRepository.findById(999L)).thenReturn(Optional.empty());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> paymentService.getPartnerPaymentHistory(999L)
        );

        assertEquals("Không tìm thấy đối tác với ID: 999", exception.getMessage());
        verify(paymentTransactionRepository, never()).findByPartnerIdOrderByCreatedAtDesc(any());
        verifyNoInteractions(partnerLedgerRepository, partnerLedgerService, codeGeneratorService);
    }

    @Test
    void getPartnerPaymentHistory_noTransactions_returnsEmptyList() {
        when(partnerRepository.findById(PARTNER_ID)).thenReturn(Optional.of(partner()));
        when(paymentTransactionRepository.findByPartnerIdOrderByCreatedAtDesc(PARTNER_ID))
                .thenReturn(List.of());

        List<PaymentResponse> history = paymentService.getPartnerPaymentHistory(PARTNER_ID);

        assertEquals(List.of(), history);
        verifyNoInteractions(partnerLedgerRepository, partnerLedgerService, codeGeneratorService);
    }

    @Test
    void getPartnerPaymentHistory_oneTransaction_returnsOneMappedResponse() {
        PaymentTransaction transaction = transaction(401L, "PT00005", "RECEIPT", "POSTED", "120.00");
        when(partnerRepository.findById(PARTNER_ID)).thenReturn(Optional.of(partner()));
        when(paymentTransactionRepository.findByPartnerIdOrderByCreatedAtDesc(PARTNER_ID))
                .thenReturn(List.of(transaction));
        when(partnerLedgerRepository.findTopByPartnerIdOrderByIdDesc(PARTNER_ID))
                .thenReturn(Optional.of(ledger("480.00")));

        List<PaymentResponse> history = paymentService.getPartnerPaymentHistory(PARTNER_ID);

        assertAll(
                () -> assertEquals(1, history.size()),
                () -> assertEquals("PT00005", history.get(0).getCode()),
                () -> assertEquals(new BigDecimal("480.00"), history.get(0).getPartnerDebtBalance())
        );
        verify(partnerLedgerRepository).findTopByPartnerIdOrderByIdDesc(PARTNER_ID);
        verifyNoInteractions(partnerLedgerService, codeGeneratorService);
    }

    @Test
    void getPartnerPaymentHistory_transactionsExist_mapsFieldsAndPreservesRepositoryOrder() {
        PaymentTransaction newest = transaction(402L, "PC00005", "VOUCHER", "POSTED", "80.00");
        PaymentTransaction oldest = transaction(401L, "PT00005", "RECEIPT", "DRAFT", "120.00");
        when(partnerRepository.findById(PARTNER_ID)).thenReturn(Optional.of(partner()));
        when(paymentTransactionRepository.findByPartnerIdOrderByCreatedAtDesc(PARTNER_ID))
                .thenReturn(List.of(newest, oldest));
        when(partnerLedgerRepository.findTopByPartnerIdOrderByIdDesc(PARTNER_ID))
                .thenReturn(Optional.of(ledger("600.00")));

        List<PaymentResponse> history = paymentService.getPartnerPaymentHistory(PARTNER_ID);

        assertAll(
                () -> assertEquals(2, history.size()),
                () -> assertEquals("PC00005", history.get(0).getCode()),
                () -> assertEquals("VOUCHER", history.get(0).getType()),
                () -> assertEquals("PT00005", history.get(1).getCode()),
                () -> assertEquals("RECEIPT", history.get(1).getType()),
                () -> assertEquals("Công ty Minh Long", history.get(0).getPartnerName()),
                () -> assertEquals(new BigDecimal("600.00"), history.get(1).getPartnerDebtBalance())
        );
        verify(partnerLedgerRepository, org.mockito.Mockito.times(2))
                .findTopByPartnerIdOrderByIdDesc(PARTNER_ID);
        verifyNoInteractions(partnerLedgerService, codeGeneratorService);
    }

    private static Stream<BigDecimal> nonPositiveAmounts() {
        return Stream.of(null, BigDecimal.ZERO, new BigDecimal("-0.01"));
    }

    private static PaymentRequest paymentRequest(
            Long partnerId,
            String amount,
            String paymentMethod,
            String status,
            String note
    ) {
        PaymentRequest request = new PaymentRequest();
        request.setPartnerId(partnerId);
        request.setAmount(amount == null ? null : new BigDecimal(amount));
        request.setPaymentMethod(paymentMethod);
        request.setStatus(status);
        request.setNote(note);
        return request;
    }

    private static Partner partner() {
        return Partner.builder()
                .id(PARTNER_ID)
                .code("DT00010")
                .name("Công ty Minh Long")
                .build();
    }

    private static PartnerLedger ledger(String balanceAfter) {
        return PartnerLedger.builder()
                .partnerId(PARTNER_ID)
                .balanceAfter(new BigDecimal(balanceAfter))
                .build();
    }

    private static PaymentTransaction transaction(
            Long id,
            String code,
            String type,
            String status,
            String amount
    ) {
        return PaymentTransaction.builder()
                .id(id)
                .transactionCode(code)
                .type(type)
                .partnerId(PARTNER_ID)
                .amount(new BigDecimal(amount))
                .status(status)
                .paymentMethod("CASH")
                .note("Thanh toán công nợ")
                .createdAt(LocalDateTime.of(2026, 8, 9, 10, 0))
                .build();
    }

    private static PaymentTransaction withId(PaymentTransaction transaction, Long id) {
        transaction.setId(id);
        return transaction;
    }
}
