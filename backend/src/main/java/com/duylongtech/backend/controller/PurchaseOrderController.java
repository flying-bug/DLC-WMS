package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.PurchaseOrderRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.PurchaseOrderResponse;
import com.duylongtech.backend.service.AuditLogService;
import com.duylongtech.backend.service.PurchaseOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/purchase-orders")
@RequiredArgsConstructor
@Tag(name = "Purchase Order", description = "Quản lý đơn mua hàng từ nhà cung cấp")
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;
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

    // ─── GET: Danh sách đơn mua hàng ───────────────────────────────────
    @GetMapping
    @Operation(summary = "Danh sách đơn mua hàng")
    @PreAuthorize("hasAuthority('import:view') or hasAuthority('purchase_order:view')")
    public ApiResponse<List<PurchaseOrderResponse>> getPurchaseOrders(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long partnerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        return ApiResponse.success(purchaseOrderService.getPurchaseOrders(keyword, status, partnerId, fromDate, toDate));
    }

    // ─── GET: Sinh mã PO tự động ────────────────────────────────────────
    @GetMapping("/next-code")
    @Operation(summary = "Sinh mã đơn mua hàng tự động")
    @PreAuthorize("hasAuthority('import:add') or hasAuthority('purchase_order:add')")
    public ApiResponse<String> getNextCode() {
        return ApiResponse.success(purchaseOrderService.generateNextPoCode());
    }

    // ─── GET: Chi tiết đơn mua hàng ────────────────────────────────────
    @GetMapping("/{id}")
    @Operation(summary = "Chi tiết đơn mua hàng")
    @PreAuthorize("hasAuthority('import:view') or hasAuthority('purchase_order:view')")
    public ApiResponse<PurchaseOrderResponse> getPurchaseOrderById(@PathVariable Long id) {
        return ApiResponse.success(purchaseOrderService.getPurchaseOrderById(id));
    }

    // ─── POST: Tạo đơn mua hàng ────────────────────────────────────────
    @PostMapping
    @Operation(summary = "Tạo đơn mua hàng mới")
    @PreAuthorize("hasAuthority('import:add') or hasAuthority('purchase_order:add')")
    public ApiResponse<PurchaseOrderResponse> createPurchaseOrder(
            @Valid @RequestBody PurchaseOrderRequest request,
            HttpServletRequest servletRequest
    ) {
        String actor = getCurrentUser();
        String ip = getClientIp(servletRequest);
        try {
            PurchaseOrderResponse created = purchaseOrderService.createPurchaseOrder(request, actor);
            auditLogService.logEvent(actor, "CREATE", "PurchaseOrder", created.getId(), "SUCCESS",
                    "Tạo đơn mua hàng: " + created.getPoCode(), ip, null);
            return ApiResponse.success(created);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "CREATE", "PurchaseOrder", null, "FAILED",
                    "Tạo đơn mua hàng thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    // ─── PUT: Cập nhật đơn mua hàng (chỉ DRAFT) ────────────────────────
    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật đơn mua hàng (chỉ khi DRAFT)")
    @PreAuthorize("hasAuthority('import:edit') or hasAuthority('purchase_order:edit')")
    public ApiResponse<PurchaseOrderResponse> updatePurchaseOrder(
            @PathVariable Long id,
            @Valid @RequestBody PurchaseOrderRequest request,
            HttpServletRequest servletRequest
    ) {
        String actor = getCurrentUser();
        String ip = getClientIp(servletRequest);
        try {
            PurchaseOrderResponse updated = purchaseOrderService.updatePurchaseOrder(id, request, actor);
            auditLogService.logEvent(actor, "UPDATE", "PurchaseOrder", id, "SUCCESS",
                    "Cập nhật đơn mua hàng: " + updated.getPoCode(), ip, null);
            return ApiResponse.success(updated);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "UPDATE", "PurchaseOrder", id, "FAILED",
                    "Cập nhật thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    // ─── PUT: Duyệt đơn ─────────────────────────────────────────────────
    @PutMapping("/{id}/approve")
    @Operation(summary = "Duyệt đơn mua hàng — ghi nhận công nợ phải trả")
    @PreAuthorize("hasAuthority('import:edit') or hasAuthority('purchase_order:edit')")
    public ApiResponse<PurchaseOrderResponse> approvePurchaseOrder(
            @PathVariable Long id,
            HttpServletRequest servletRequest
    ) {
        String actor = getCurrentUser();
        String ip = getClientIp(servletRequest);
        try {
            PurchaseOrderResponse approved = purchaseOrderService.approvePurchaseOrder(id, actor);
            auditLogService.logEvent(actor, "APPROVE", "PurchaseOrder", id, "SUCCESS",
                    "Duyệt đơn mua hàng: " + approved.getPoCode(), ip, null);
            return ApiResponse.success(approved);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "APPROVE", "PurchaseOrder", id, "FAILED",
                    "Duyệt thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    // ─── PUT: Hủy đơn ───────────────────────────────────────────────────
    @PutMapping("/{id}/cancel")
    @Operation(summary = "Hủy đơn mua hàng")
    @PreAuthorize("hasAuthority('import:edit') or hasAuthority('purchase_order:edit')")
    public ApiResponse<PurchaseOrderResponse> cancelPurchaseOrder(
            @PathVariable Long id,
            HttpServletRequest servletRequest
    ) {
        String actor = getCurrentUser();
        String ip = getClientIp(servletRequest);
        try {
            PurchaseOrderResponse cancelled = purchaseOrderService.cancelPurchaseOrder(id, actor);
            auditLogService.logEvent(actor, "CANCEL", "PurchaseOrder", id, "SUCCESS",
                    "Hủy đơn mua hàng: " + cancelled.getPoCode(), ip, null);
            return ApiResponse.success(cancelled);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "CANCEL", "PurchaseOrder", id, "FAILED",
                    "Hủy thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    // ─── POST: Ghi nhận thanh toán ───────────────────────────────────────
    @PostMapping("/{id}/payments")
    @Operation(summary = "Ghi nhận thanh toán (chi tiền) cho đơn mua hàng")
    @PreAuthorize("hasAuthority('import:edit') or hasAuthority('purchase_order:edit')")
    public ApiResponse<PurchaseOrderResponse> recordPayment(
            @PathVariable Long id,
            @RequestBody PaymentBodyRequest req,
            HttpServletRequest servletRequest
    ) {
        String actor = getCurrentUser();
        String ip = getClientIp(servletRequest);
        try {
            PurchaseOrderResponse updated = purchaseOrderService.recordPayment(id, req.getAmount(), actor);
            auditLogService.logEvent(actor, "RECORD_PAYMENT", "PurchaseOrder", id, "SUCCESS",
                    "Ghi nhận thanh toán " + req.getAmount() + " cho đơn: " + updated.getPoCode(), ip, null);
            return ApiResponse.success(updated);
        } catch (Exception e) {
            auditLogService.logEvent(actor, "RECORD_PAYMENT", "PurchaseOrder", id, "FAILED",
                    "Ghi nhận thanh toán thất bại: " + e.getMessage(), ip, null);
            throw e;
        }
    }

    public static class PaymentBodyRequest {
        public BigDecimal amount;
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
    }
}
