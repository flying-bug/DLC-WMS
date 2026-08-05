package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.PaymentRequest;
import com.duylongtech.backend.dto.response.PaymentResponse;
import com.duylongtech.backend.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payment Management", description = "APIs cho Phiếu thu (Receipt) & Phiếu chi (Voucher) công nợ")
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/receipts")
    @Operation(summary = "Tạo phiếu thu tiền (Thu nợ Khách hàng / Khác)")
    public ResponseEntity<PaymentResponse> createReceipt(@RequestBody PaymentRequest request) {
        return ResponseEntity.ok(paymentService.createPaymentReceipt(request));
    }

    @PostMapping("/vouchers")
    @Operation(summary = "Tạo phiếu chi tiền (Thanh toán nợ Nhà cung cấp / Khác)")
    public ResponseEntity<PaymentResponse> createVoucher(@RequestBody PaymentRequest request) {
        return ResponseEntity.ok(paymentService.createPaymentVoucher(request));
    }

    @GetMapping("/history/{partnerId}")
    @Operation(summary = "Lấy lịch sử thu / chi tiền của một đối tác")
    public ResponseEntity<List<PaymentResponse>> getPartnerHistory(@PathVariable Long partnerId) {
        return ResponseEntity.ok(paymentService.getPartnerPaymentHistory(partnerId));
    }
}
