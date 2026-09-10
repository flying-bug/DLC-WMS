package com.duylongtech.backend.controller;

import com.duylongtech.backend.annotation.Auditable;
import com.duylongtech.backend.enums.AuditAction;
import com.duylongtech.backend.dto.request.DirectCheckoutRequest;
import com.duylongtech.backend.dto.request.SalesOrderRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.SalesOrderResponse;
import com.duylongtech.backend.service.DirectCheckoutService;
import com.duylongtech.backend.service.SalesOrderService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/sales-orders")
@RequiredArgsConstructor
public class SalesOrderController {

    private final SalesOrderService salesOrderService;
    private final DirectCheckoutService directCheckoutService;

    private String getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null) ? auth.getName() : "System";
    }

    // ─── GET: Danh sách đơn bán hàng ───────────────────────────────────
    @GetMapping
    @Operation(summary = "Danh sách đơn bán hàng")
    @PreAuthorize("hasAuthority('sales_order:view')")
    public ApiResponse<List<SalesOrderResponse>> getSalesOrders(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String reservationStatus,
            @RequestParam(required = false) String exportDocumentStatus,
            @RequestParam(required = false) Long partnerId,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        return ApiResponse.success(
                salesOrderService.getSalesOrders(
                        keyword,
                        status,
                        reservationStatus,
                        exportDocumentStatus,
                        partnerId,
                        warehouseId,
                        fromDate,
                        toDate
                )
        );
    }

    // ─── GET: Sinh mã SO tự động ────────────────────────────────────────
    @GetMapping("/next-code")
    @Operation(summary = "Sinh mã đơn bán hàng tự động")
    @PreAuthorize("hasAuthority('sales_order:add')")
    public ApiResponse<String> getNextCode() {
        return ApiResponse.success(salesOrderService.generateNextSoCode());
    }

    // ─── GET: Chi tiết đơn bán hàng ────────────────────────────────────
    @GetMapping("/{id}")
    @Operation(summary = "Chi tiết đơn bán hàng")
    @PreAuthorize("hasAuthority('sales_order:view')")
    public ApiResponse<SalesOrderResponse> getSalesOrderById(@PathVariable Long id) {
        return ApiResponse.success(salesOrderService.getSalesOrderById(id));
    }

    // ─── POST: Tạo đơn bán hàng ────────────────────────────────────────
    @PostMapping
    @Operation(summary = "Tạo đơn bán hàng mới")
    @PreAuthorize("hasAuthority('sales_order:add')")
    @Auditable(action = AuditAction.CREATE, entityName = "SalesOrder", actionDescription = "Tạo đơn bán hàng")
    public ApiResponse<SalesOrderResponse> createSalesOrder(
            @Valid @RequestBody SalesOrderRequest request
    ) {
        String actor = getCurrentUser();
        return ApiResponse.success(salesOrderService.createSalesOrder(request, actor));
    }

    // ─── PUT: Cập nhật đơn bán hàng (chỉ DRAFT) ────────────────────────
    @PostMapping("/direct-checkout")
    @Operation(summary = "Bán hàng trực tiếp: tạo đơn, xuất kho và ghi nhận thanh toán")
    @PreAuthorize("hasAuthority('sales_order:add')")
    @Auditable(action = AuditAction.DIRECT_CHECKOUT, entityName = "SalesOrder", actionDescription = "Bán hàng trực tiếp")
    public ApiResponse<SalesOrderResponse> directCheckout(
            @Valid @RequestBody DirectCheckoutRequest request
    ) {
        String actor = getCurrentUser();
        return ApiResponse.success(directCheckoutService.directCheckout(request, actor));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật đơn bán hàng (chỉ khi DRAFT)")
    @PreAuthorize("hasAuthority('sales_order:edit')")
    @Auditable(action = AuditAction.UPDATE, entityName = "SalesOrder", actionDescription = "Cập nhật đơn bán hàng")
    public ApiResponse<SalesOrderResponse> updateSalesOrder(
            @PathVariable Long id,
            @Valid @RequestBody SalesOrderRequest request
    ) {
        String actor = getCurrentUser();
        return ApiResponse.success(salesOrderService.updateSalesOrder(id, request, actor));
    }

    // ─── PUT: Duyệt đơn bán hàng (tạo reservation) ──────────────────────
    @PutMapping("/{id}/approve")
    @Operation(summary = "Duyệt đơn bán hàng và giữ chỗ tồn kho")
    @PreAuthorize("hasAuthority('sales_order:edit')")
    @Auditable(action = AuditAction.APPROVE, entityName = "SalesOrder", actionDescription = "Duyệt đơn bán hàng")
    public ApiResponse<SalesOrderResponse> approveSalesOrder(
            @PathVariable Long id
    ) {
        String actor = getCurrentUser();
        return ApiResponse.success(salesOrderService.approveSalesOrder(id, actor));
    }

    // ─── PUT: Hủy đơn bán hàng (release reservation) ────────────────────
    @PutMapping("/{id}/cancel")
    @Operation(summary = "Hủy đơn bán hàng và giải phóng tồn kho đã giữ")
    @PreAuthorize("hasAuthority('sales_order:edit')")
    @Auditable(action = AuditAction.CANCEL, entityName = "SalesOrder", actionDescription = "Hủy đơn bán hàng")
    public ApiResponse<SalesOrderResponse> cancelSalesOrder(
            @PathVariable Long id
    ) {
        String actor = getCurrentUser();
        return ApiResponse.success(salesOrderService.cancelSalesOrder(id, actor));
    }

    public static class PaymentRequest {
        public java.math.BigDecimal amount;
        public java.math.BigDecimal getAmount() { return amount; }
        public void setAmount(java.math.BigDecimal amount) { this.amount = amount; }
    }

    // ─── POST: Ghi nhận thanh toán ───────────────────────────────────────
    @PostMapping("/{id}/payments")
    @Operation(summary = "Ghi nhận thanh toán cho đơn hàng")
    @PreAuthorize("hasAuthority('sales_order:edit')")
    @Auditable(action = AuditAction.RECORD_PAYMENT, entityName = "SalesOrder", actionDescription = "Ghi nhận thanh toán")
    public ApiResponse<SalesOrderResponse> recordPayment(
            @PathVariable Long id,
            @RequestBody PaymentRequest req
    ) {
        String actor = getCurrentUser();
        return ApiResponse.success(salesOrderService.recordPayment(id, req.getAmount(), actor));
    }

    // ─── POST: Gửi email báo giá ─────────────────────────────────────────
    @PostMapping("/{id}/send-quote-email")
    @Operation(summary = "Gửi email báo giá cho khách hàng")
    @PreAuthorize("hasAuthority('sales_order:view')")
    @Auditable(action = AuditAction.SEND_QUOTE_EMAIL, entityName = "SalesOrder", actionDescription = "Gửi email báo giá")
    public ApiResponse<Void> sendQuoteEmail(
            @PathVariable Long id,
            @Valid @RequestBody com.duylongtech.backend.dto.request.EmailQuoteRequest req
    ) {
        salesOrderService.sendQuoteEmail(id, req);
        return ApiResponse.success(null);
    }
}
