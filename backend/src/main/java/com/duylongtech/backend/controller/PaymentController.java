package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.PaymentRequest;
import com.duylongtech.backend.dto.response.PaymentResponse;
import com.duylongtech.backend.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payment Management", description = "Receipt, voucher and partner debt APIs")
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/receipts")
    @Operation(summary = "Create customer receipt")
    public ResponseEntity<PaymentResponse> createReceipt(@RequestBody PaymentRequest request) {
        return ResponseEntity.ok(paymentService.createPaymentReceipt(request));
    }

    @PostMapping("/vouchers")
    @Operation(summary = "Create supplier payment voucher")
    public ResponseEntity<PaymentResponse> createVoucher(@RequestBody PaymentRequest request) {
        return ResponseEntity.ok(paymentService.createPaymentVoucher(request));
    }

    @PostMapping("/{id}/post")
    @Operation(summary = "Post a DRAFT receipt/voucher")
    public ResponseEntity<PaymentResponse> postPayment(@PathVariable Long id) {
        return ResponseEntity.ok(paymentService.postPayment(id));
    }

    @GetMapping("/balance/{partnerId}")
    @Operation(summary = "Get current partner debt balance")
    public ResponseEntity<BigDecimal> getPartnerDebtBalance(@PathVariable Long partnerId) {
        return ResponseEntity.ok(paymentService.getPartnerDebtBalance(partnerId));
    }

    @GetMapping("/history/{partnerId}")
    @Operation(summary = "Get receipt/voucher history for a partner")
    public ResponseEntity<List<PaymentResponse>> getPartnerHistory(@PathVariable Long partnerId) {
        return ResponseEntity.ok(paymentService.getPartnerPaymentHistory(partnerId));
    }
}
