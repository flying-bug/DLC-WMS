package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.DirectCheckoutRequest;
import com.duylongtech.backend.dto.request.SalesOrderRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.SalesOrderResponse;
import com.duylongtech.backend.service.AuditLogService;
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
    private final AuditLogService auditLogService;

    private String getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null) ? auth.getName() : "System";
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) ip = request.getRemoteAddr();
        if (ip != null && ip.contains(",")) ip = ip.split(",")[0].trim();
        return ip;
    }

    // ─── GET: Danh sách đơn bán hàng ───────────────────────────────────
    @GetMapping
    @Operation(summary = "Danh sách đơn bán hàng")
    @PreAuthorize("hasAuthority('sales_order:view')")
    public ApiResponse<List<SalesOrderResponse>> getSalesOrders(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long partnerId,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        return ApiResponse.success(salesOrderService.getSalesOrders(keyword, status, partnerId, warehouseId, fromDate, toDate));
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
    public ApiResponse<SalesOrderResponse> createSalesOrder(
            @Valid @RequestBody SalesOrderRequest request,
            HttpServletRequest servletRequest
    ) {
        String actor = getCurrentUser();
        String ip = getClientIp(servletRequest);
        try {
            SalesOrderResponse created = salesOrderService.createSalesOrder(request, actor);
            auditLogService.logEvent(actor, "CREATE", "SalesOrder", created.getId(), "SUCCESS",
                    "Tạo đơn bán hàng: " + created.getSoCode(), ip, null);
            return ApiResponse.success(created);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "CREATE", "SalesOrder", null, "FAILED",
                    "Tạo đơn bán hàng thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    // ─── PUT: Cập nhật đơn bán hàng (chỉ DRAFT) ────────────────────────
    @PostMapping("/direct-checkout")
    @Operation(summary = "Bán hàng trực tiếp: tạo đơn, xuất kho và ghi nhận thanh toán")
    @PreAuthorize("hasAuthority('sales_order:add')")
    public ApiResponse<SalesOrderResponse> directCheckout(
            @Valid @RequestBody DirectCheckoutRequest request,
            HttpServletRequest servletRequest
    ) {
        String actor = getCurrentUser();
        String ip = getClientIp(servletRequest);
        try {
            SalesOrderResponse created = directCheckoutService.directCheckout(request, actor);
            auditLogService.logEvent(actor, "DIRECT_CHECKOUT", "SalesOrder", created.getId(), "SUCCESS",
                    "Bán hàng trực tiếp: " + created.getSoCode(), ip, null);
            return ApiResponse.success(created);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "DIRECT_CHECKOUT", "SalesOrder", null, "FAILED",
                    "Bán hàng trực tiếp thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật đơn bán hàng (chỉ khi DRAFT)")
    @PreAuthorize("hasAuthority('sales_order:edit')")
    public ApiResponse<SalesOrderResponse> updateSalesOrder(
            @PathVariable Long id,
            @Valid @RequestBody SalesOrderRequest request,
            HttpServletRequest servletRequest
    ) {
        String actor = getCurrentUser();
        String ip = getClientIp(servletRequest);
        try {
            SalesOrderResponse updated = salesOrderService.updateSalesOrder(id, request, actor);
            auditLogService.logEvent(actor, "UPDATE", "SalesOrder", id, "SUCCESS",
                    "Cập nhật đơn bán hàng: " + updated.getSoCode(), ip, null);
            return ApiResponse.success(updated);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "UPDATE", "SalesOrder", id, "FAILED",
                    "Cập nhật đơn bán hàng thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    // ─── PUT: Duyệt đơn bán hàng (tạo reservation) ──────────────────────
    @PutMapping("/{id}/approve")
    @Operation(summary = "Duyệt đơn bán hàng và giữ chỗ tồn kho")
    @PreAuthorize("hasAuthority('sales_order:edit')")
    public ApiResponse<SalesOrderResponse> approveSalesOrder(
            @PathVariable Long id,
            HttpServletRequest servletRequest
    ) {
        String actor = getCurrentUser();
        String ip = getClientIp(servletRequest);
        try {
            SalesOrderResponse approved = salesOrderService.approveSalesOrder(id, actor);
            auditLogService.logEvent(actor, "APPROVE", "SalesOrder", id, "SUCCESS",
                    "Duyệt đơn bán hàng: " + approved.getSoCode(), ip, null);
            return ApiResponse.success(approved);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "APPROVE", "SalesOrder", id, "FAILED",
                    "Duyệt đơn bán hàng thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    // ─── PUT: Hủy đơn bán hàng (release reservation) ────────────────────
    @PutMapping("/{id}/cancel")
    @Operation(summary = "Hủy đơn bán hàng và giải phóng tồn kho đã giữ")
    @PreAuthorize("hasAuthority('sales_order:edit')")
    public ApiResponse<SalesOrderResponse> cancelSalesOrder(
            @PathVariable Long id,
            HttpServletRequest servletRequest
    ) {
        String actor = getCurrentUser();
        String ip = getClientIp(servletRequest);
        try {
            SalesOrderResponse cancelled = salesOrderService.cancelSalesOrder(id, actor);
            auditLogService.logEvent(actor, "CANCEL", "SalesOrder", id, "SUCCESS",
                    "Hủy đơn bán hàng: " + cancelled.getSoCode(), ip, null);
            return ApiResponse.success(cancelled);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "CANCEL", "SalesOrder", id, "FAILED",
                    "Hủy đơn bán hàng thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
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
    public ApiResponse<SalesOrderResponse> recordPayment(
            @PathVariable Long id,
            @RequestBody PaymentRequest req,
            HttpServletRequest servletRequest
    ) {
        String actor = getCurrentUser();
        String ip = getClientIp(servletRequest);
        try {
            SalesOrderResponse updated = salesOrderService.recordPayment(id, req.getAmount(), actor);
            auditLogService.logEvent(actor, "RECORD_PAYMENT", "SalesOrder", id, "SUCCESS",
                    "Ghi nhận thanh toán " + req.getAmount() + " cho đơn hàng: " + updated.getSoCode(), ip, null);
            return ApiResponse.success(updated);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "RECORD_PAYMENT", "SalesOrder", id, "FAILED",
                    "Ghi nhận thanh toán thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    // ─── POST: Gửi email báo giá ─────────────────────────────────────────
    @PostMapping("/{id}/send-quote-email")
    @Operation(summary = "Gửi email báo giá cho khách hàng")
    @PreAuthorize("hasAuthority('sales_order:view')")
    public ApiResponse<Void> sendQuoteEmail(
            @PathVariable Long id,
            @Valid @RequestBody com.duylongtech.backend.dto.request.EmailQuoteRequest req,
            HttpServletRequest servletRequest
    ) {
        String actor = getCurrentUser();
        String ip = getClientIp(servletRequest);
        try {
            salesOrderService.sendQuoteEmail(id, req);
            auditLogService.logEvent(actor, "SEND_QUOTE_EMAIL", "SalesOrder", id, "SUCCESS",
                    "Gửi email báo giá tới " + req.getToEmail(), ip, null);
            return ApiResponse.success(null);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "SEND_QUOTE_EMAIL", "SalesOrder", id, "FAILED",
                    "Gửi email báo giá thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }
}
