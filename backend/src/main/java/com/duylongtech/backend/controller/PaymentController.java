package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.PaymentRequest;
import com.duylongtech.backend.dto.response.PartnerLedgerResponse;
import com.duylongtech.backend.dto.response.PaymentResponse;
import com.duylongtech.backend.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payment Management", description = "Receipt, voucher and partner debt APIs")
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping
    @PreAuthorize("hasAuthority('payment:view')")
    @Operation(summary = "Get all payment receipts and vouchers")
    public ResponseEntity<List<PaymentResponse>> getAllPayments(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(paymentService.getAllPayments(type, status));
    }

    @PostMapping("/receipts")

    @PreAuthorize("hasAuthority('payment:add')")
    @Operation(summary = "Create customer receipt")
    public ResponseEntity<PaymentResponse> createReceipt(@RequestBody PaymentRequest request) {
        return ResponseEntity.ok(paymentService.createPaymentReceipt(request));
    }

    @PostMapping("/vouchers")
    @PreAuthorize("hasAuthority('payment:add')")
    @Operation(summary = "Create supplier payment voucher")
    public ResponseEntity<PaymentResponse> createVoucher(@RequestBody PaymentRequest request) {
        return ResponseEntity.ok(paymentService.createPaymentVoucher(request));
    }

    @PostMapping("/{id}/post")
    @PreAuthorize("hasAuthority('payment:edit')")
    @Operation(summary = "Post a DRAFT receipt/voucher")
    public ResponseEntity<PaymentResponse> postPayment(@PathVariable Long id) {
        return ResponseEntity.ok(paymentService.postPayment(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('payment:edit')")
    @Operation(summary = "Update a DRAFT receipt/voucher")
    public ResponseEntity<PaymentResponse> updatePayment(@PathVariable Long id, @RequestBody PaymentRequest request) {
        return ResponseEntity.ok(paymentService.updatePayment(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('payment:delete') or hasAuthority('payment:edit')")
    @Operation(summary = "Delete a DRAFT receipt/voucher")
    public ResponseEntity<Void> deletePayment(@PathVariable Long id) {
        paymentService.deletePayment(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/balance/{partnerId}")
    @PreAuthorize("hasAuthority('payment:view')")
    @Operation(summary = "Get current partner debt balance")
    public ResponseEntity<BigDecimal> getPartnerDebtBalance(@PathVariable Long partnerId) {
        return ResponseEntity.ok(paymentService.getPartnerDebtBalance(partnerId));
    }

    @GetMapping("/history/{partnerId}")
    @PreAuthorize("hasAuthority('payment:view')")
    @Operation(summary = "Get receipt/voucher history for a partner")
    public ResponseEntity<List<PaymentResponse>> getPartnerHistory(@PathVariable Long partnerId) {
        return ResponseEntity.ok(paymentService.getPartnerPaymentHistory(partnerId));
    }

    @GetMapping("/ledger/{partnerId}")
    @PreAuthorize("hasAuthority('payment:view')")
    @Operation(summary = "Get full ledger details (invoices & payments) for a partner")
    public ResponseEntity<List<PartnerLedgerResponse>> getPartnerLedger(@PathVariable Long partnerId) {
        return ResponseEntity.ok(paymentService.getPartnerLedgerDetails(partnerId));
    }
}
