package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.CustomerRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.CustomerResponse;
import com.duylongtech.backend.dto.response.SalesHistoryResponse;
import com.duylongtech.backend.dto.response.WarrantyHistoryResponse;
import com.duylongtech.backend.dto.response.ReceiptHistoryResponse;
import com.duylongtech.backend.service.AuditLogService;
import com.duylongtech.backend.service.CustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

/**
 * Controller xử lý API Quản lý Khách hàng (Customer Management).
 *
 * <p>Base URL: /api/v1/customers
 *
 * <p>Các endpoint:
 * <ul>
 *   <li>GET    /api/v1/customers          - UC-CUST-01: Tìm kiếm khách hàng (Autocomplete SĐT)</li>
 *   <li>GET    /api/v1/customers/{id}     - UC-CUST-03: Xem chi tiết khách hàng</li>
 *   <li>POST   /api/v1/customers          - UC-CUST-02: Tạo mới khách hàng</li>
 *   <li>PUT    /api/v1/customers/{id}     - UC-CUST-04: Cập nhật thông tin khách hàng</li>
 *   <li>PATCH  /api/v1/customers/{id}/status - UC-CUST-05: Vô hiệu hóa khách hàng</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
@Tag(name = "Customer Management", description = "API quản lý khách hàng - UC-CUST-01 đến UC-CUST-05")
public class CustomerController {

    private final CustomerService  customerService;
    private final AuditLogService  auditLogService;

    // ─────────────────────────────────────────────────────────────────────────
    // READ
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-CUST-01: Tìm kiếm khách hàng theo SĐT (Autocomplete).
     * Bắt buộc phân trang.
     *
     * @param phone từ khóa SĐT (partial match, optional)
     * @param page  trang hiện tại (default: 0)
     * @param size  số bản ghi mỗi trang (default: 10)
     */
    @GetMapping
    @Operation(summary = "Tìm kiếm khách hàng theo SĐT (UC-CUST-01)")
    @PreAuthorize("hasAuthority('customer:view')")
    public ApiResponse<Page<CustomerResponse>> searchCustomers(
            @RequestParam(required = false) String phone,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ApiResponse.success(customerService.searchCustomers(phone, page, size));
    }

    /**
     * UC-CUST-03: Xem chi tiết khách hàng.
     * Trả về CUST04 nếu là Khách vãng lai (KH-0000).
     *
     * @param id ID khách hàng
     */
    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết khách hàng (UC-CUST-03)")
    @PreAuthorize("hasAuthority('customer:view')")
    public ApiResponse<CustomerResponse> getCustomerById(@PathVariable Long id) {
        return ApiResponse.success(customerService.getCustomerById(id));
    }

    /**
     * UC-CUST-06: Lịch sử mua hàng
     */
    @GetMapping("/{id}/sales-history")
    @Operation(summary = "Lịch sử mua hàng (UC-CUST-06)")
    @PreAuthorize("hasAuthority('customer:view')")
    public ApiResponse<Page<SalesHistoryResponse>> getSalesHistory(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ApiResponse.success(customerService.getSalesHistory(id, page, size));
    }

    /**
     * UC-CUST-07: Lịch sử bảo hành
     */
    @GetMapping("/{id}/warranties")
    @Operation(summary = "Lịch sử bảo hành (UC-CUST-07)")
    @PreAuthorize("hasAuthority('customer:view')")
    public ApiResponse<Page<WarrantyHistoryResponse>> getWarrantyHistory(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ApiResponse.success(customerService.getWarrantyHistory(id, page, size));
    }

    /**
     * UC-CUST-08: Lịch sử thu chi & Tổng tiền
     */
    @GetMapping("/{id}/receipts")
    @Operation(summary = "Lịch sử thu chi (UC-CUST-08)")
    @PreAuthorize("hasAuthority('customer:view')")
    public ApiResponse<ReceiptHistoryResponse> getReceiptHistory(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ApiResponse.success(customerService.getReceiptHistory(id, page, size));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-CUST-02: Tạo mới khách hàng.
     * Hỗ trợ tạo nhanh (Quick Create) từ màn hình Giao dịch.
     *
     * @param req            dữ liệu khách hàng mới
     * @param servletRequest HTTP request (lấy IP cho Audit Log)
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Tạo mới khách hàng (UC-CUST-02)")
    @PreAuthorize("hasAuthority('customer:add')")
    public ApiResponse<CustomerResponse> createCustomer(
            @Valid @RequestBody CustomerRequest req,
            HttpServletRequest servletRequest
    ) {
        String actor = getCurrentUser();
        String ip    = getClientIp(servletRequest);
        try {
            CustomerResponse created = customerService.createCustomer(req);
            auditLogService.logEvent(
                    actor, "CREATE", "Customer", created.getId(),
                    "SUCCESS", "Tạo khách hàng: " + created.getName() + " - " + created.getPhone(),
                    ip, null
            );
            return ApiResponse.success(created);
        } catch (Exception e) {
            auditLogService.logEvent(
                    actor, "CREATE", "Customer", null,
                    "FAILED", "Tạo khách hàng thất bại: " + e.getMessage(),
                    ip, null
            );
            throw e;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-CUST-04: Cập nhật thông tin khách hàng.
     * Ghi Audit Log nếu SĐT thay đổi (Issue #2 - clarify.md).
     *
     * @param id             ID khách hàng
     * @param req            dữ liệu cập nhật
     * @param servletRequest HTTP request (lấy IP)
     */
    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật khách hàng (UC-CUST-04)")
    @PreAuthorize("hasAuthority('customer:edit')")
    public ApiResponse<CustomerResponse> updateCustomer(
            @PathVariable Long id,
            @Valid @RequestBody CustomerRequest req,
            HttpServletRequest servletRequest
    ) {
        String actor = getCurrentUser();
        String ip    = getClientIp(servletRequest);
        try {
            CustomerResponse updated = customerService.updateCustomer(id, req, actor);
            auditLogService.logEvent(
                    actor, "UPDATE", "Customer", id,
                    "SUCCESS", "Cập nhật khách hàng ID: " + id,
                    ip, null
            );
            return ApiResponse.success(updated);
        } catch (Exception e) {
            auditLogService.logEvent(
                    actor, "UPDATE", "Customer", id,
                    "FAILED", "Cập nhật khách hàng ID " + id + " thất bại: " + e.getMessage(),
                    ip, null
            );
            throw e;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DEACTIVATE (Soft Delete)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-CUST-05: Vô hiệu hóa khách hàng (Soft Delete).
     * Chặn nếu khách hàng còn thiết bị đang sửa chữa (CUST03).
     *
     * @param id             ID khách hàng
     * @param servletRequest HTTP request (lấy IP)
     */
    @PatchMapping("/{id}/status")
    @Operation(summary = "Vô hiệu hóa khách hàng (UC-CUST-05)")
    @PreAuthorize("hasAuthority('customer:edit')")
    public ApiResponse<Void> deactivateCustomer(
            @PathVariable Long id,
            HttpServletRequest servletRequest
    ) {
        String actor = getCurrentUser();
        String ip    = getClientIp(servletRequest);
        try {
            customerService.deactivateCustomer(id);
            auditLogService.logEvent(
                    actor, "DEACTIVATE", "Customer", id,
                    "SUCCESS", "Vô hiệu hóa khách hàng ID: " + id,
                    ip, null
            );
            return ApiResponse.success(null);
        } catch (Exception e) {
            auditLogService.logEvent(
                    actor, "DEACTIVATE", "Customer", id,
                    "FAILED", "Vô hiệu hóa khách hàng ID " + id + " thất bại: " + e.getMessage(),
                    ip, null
            );
            throw e;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private String getCurrentUser() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
