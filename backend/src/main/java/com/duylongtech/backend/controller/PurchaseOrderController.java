package com.duylongtech.backend.controller;

import com.duylongtech.backend.annotation.Auditable;
import com.duylongtech.backend.enums.AuditAction;
import com.duylongtech.backend.dto.request.PurchaseOrderRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.PurchaseOrderResponse;
import com.duylongtech.backend.service.PurchaseOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/purchase-orders")
@RequiredArgsConstructor
@Tag(name = "Purchase Order", description = "Quản lý đơn mua hàng từ nhà cung cấp")
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    private String getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null) ? auth.getName() : "System";
    }

    // ─── GET: Danh sách đơn mua hàng ───────────────────────────────────
    @GetMapping
    @Operation(summary = "Danh sách đơn mua hàng")
    @PreAuthorize("hasAuthority('purchase_order:view')")
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
    @PreAuthorize("hasAuthority('purchase_order:add')")
    public ApiResponse<String> getNextCode() {
        return ApiResponse.success(purchaseOrderService.generateNextPoCode());
    }

    // ─── GET: Chi tiết đơn mua hàng ────────────────────────────────────
    @GetMapping("/{id}")
    @Operation(summary = "Chi tiết đơn mua hàng")
    @PreAuthorize("hasAuthority('purchase_order:view')")
    public ApiResponse<PurchaseOrderResponse> getPurchaseOrderById(@PathVariable Long id) {
        return ApiResponse.success(purchaseOrderService.getPurchaseOrderById(id));
    }

    // ─── POST: Tạo đơn mua hàng ────────────────────────────────────────
    @PostMapping
    @Operation(summary = "Tạo đơn mua hàng mới")
    @PreAuthorize("hasAuthority('purchase_order:add')")
    @Auditable(action = AuditAction.CREATE, entityName = "PurchaseOrder", actionDescription = "Tạo đơn mua hàng")
    public ApiResponse<PurchaseOrderResponse> createPurchaseOrder(
            @Valid @RequestBody PurchaseOrderRequest request
    ) {
        String actor = getCurrentUser();
        return ApiResponse.success(purchaseOrderService.createPurchaseOrder(request, actor));
    }

    // ─── PUT: Cập nhật đơn mua hàng (chỉ DRAFT) ────────────────────────
    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật đơn mua hàng (chỉ khi DRAFT)")
    @PreAuthorize("hasAuthority('purchase_order:edit')")
    @Auditable(action = AuditAction.UPDATE, entityName = "PurchaseOrder", actionDescription = "Cập nhật đơn mua hàng")
    public ApiResponse<PurchaseOrderResponse> updatePurchaseOrder(
            @PathVariable Long id,
            @Valid @RequestBody PurchaseOrderRequest request
    ) {
        String actor = getCurrentUser();
        return ApiResponse.success(purchaseOrderService.updatePurchaseOrder(id, request, actor));
    }

    // ─── PUT: Duyệt đơn ─────────────────────────────────────────────────
    @PutMapping("/{id}/approve")
    @Operation(summary = "Duyệt đơn mua hàng — ghi nhận công nợ phải trả")
    @PreAuthorize("hasAuthority('purchase_order:edit')")
    @Auditable(action = AuditAction.APPROVE, entityName = "PurchaseOrder", actionDescription = "Duyệt đơn mua hàng")
    public ApiResponse<PurchaseOrderResponse> approvePurchaseOrder(
            @PathVariable Long id
    ) {
        String actor = getCurrentUser();
        return ApiResponse.success(purchaseOrderService.approvePurchaseOrder(id, actor));
    }

    // ─── PUT: Hủy đơn ───────────────────────────────────────────────────
    @PutMapping("/{id}/cancel")
    @Operation(summary = "Hủy đơn mua hàng")
    @PreAuthorize("hasAuthority('purchase_order:edit')")
    @Auditable(action = AuditAction.CANCEL, entityName = "PurchaseOrder", actionDescription = "Hủy đơn mua hàng")
    public ApiResponse<PurchaseOrderResponse> cancelPurchaseOrder(
            @PathVariable Long id
    ) {
        String actor = getCurrentUser();
        return ApiResponse.success(purchaseOrderService.cancelPurchaseOrder(id, actor));
    }

}
