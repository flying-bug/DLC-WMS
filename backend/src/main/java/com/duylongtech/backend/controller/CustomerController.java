package com.duylongtech.backend.controller;

import com.duylongtech.backend.annotation.Auditable;
import com.duylongtech.backend.enums.AuditAction;
import com.duylongtech.backend.dto.request.CustomerRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.CustomerResponse;
import com.duylongtech.backend.dto.response.SalesHistoryResponse;
import com.duylongtech.backend.dto.response.WarrantyHistoryResponse;
import com.duylongtech.backend.dto.response.ReceiptHistoryResponse;
import com.duylongtech.backend.service.CustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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

    // ─────────────────────────────────────────────────────────────────────────
    // READ
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-CUST-01: Tìm kiếm khách hàng.
     * Hỗ trợ lọc theo keyword (SĐT, tên), status, groupType. Bắt buộc phân trang.
     *
     * @param keyword    từ khóa (SĐT, tên) (optional)
     * @param status     trạng thái (optional)
     * @param groupType  nhóm khách hàng (optional)
     * @param page       trang hiện tại (default: 0)
     * @param size       số bản ghi mỗi trang (default: 10)
     */
    @GetMapping
    @Operation(summary = "Tìm kiếm khách hàng (UC-CUST-01)")
    @PreAuthorize("hasAuthority('customer:view')")
    public ApiResponse<Page<CustomerResponse>> searchCustomers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String groupType,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ApiResponse.success(customerService.searchCustomers(keyword, status, groupType, page, size));
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

    /**
     * UC-CUST-EXPORT: Xuất Excel
     */
    @GetMapping("/export")
    @Operation(summary = "Xuất dữ liệu khách hàng ra Excel")
    @PreAuthorize("hasAuthority('customer:view')")
    public org.springframework.http.ResponseEntity<byte[]> exportCustomers(
            @RequestParam(required = false) java.util.List<Long> ids,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String groupType
    ) {
        java.util.List<com.duylongtech.backend.entity.Partner> customers = customerService.getCustomersForExport(ids, keyword, status, groupType);
        byte[] excelBytes = customerService.exportToExcel(customers);

        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", "customers.xlsx");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return new org.springframework.http.ResponseEntity<>(excelBytes, headers, HttpStatus.OK);
    }

    /**
     * UC-CUST-IMPORT-1.5: Tải file template Excel
     */
    @GetMapping("/import/template")
    @Operation(summary = "Tải file Excel mẫu để Import")
    @PreAuthorize("hasAuthority('customer:view')")
    public org.springframework.http.ResponseEntity<byte[]> downloadTemplate() {
        byte[] excelBytes = customerService.exportTemplateToExcel();

        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", "DLC_WMS_Template_Khach_Hang.xlsx");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return new org.springframework.http.ResponseEntity<>(excelBytes, headers, HttpStatus.OK);
    }

    /**
     * UC-CUST-IMPORT-1: Upload file Excel để Preview
     */
    @PostMapping(value = "/import/preview", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Preview file Excel để Import")
    @PreAuthorize("hasAuthority('customer:add')")
    public ApiResponse<com.duylongtech.backend.dto.response.CustomerResponse.ImportPreviewResponse> previewImport(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file
    ) {
        return ApiResponse.success(customerService.previewImport(file));
    }

    /**
     * UC-CUST-IMPORT-2: Xác nhận Import dữ liệu (Insert + Merge)
     */
    @PostMapping("/import/confirm")
    @Operation(summary = "Xác nhận lưu dữ liệu Import")
    @PreAuthorize("hasAuthority('customer:add')")
    @Auditable(action = AuditAction.IMPORT, entityName = "Customer", actionDescription = "Import khách hàng")
    public ApiResponse<Void> confirmImport(
            @RequestBody com.duylongtech.backend.dto.request.CustomerRequest.ImportConfirmRequest request
    ) {
        String actor = SecurityContextHolder.getContext().getAuthentication().getName();
        customerService.confirmImport(request, actor);
        return ApiResponse.success(null);
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
    @Auditable(action = AuditAction.CREATE, entityName = "Customer", actionDescription = "Tạo mới khách hàng")
    public ApiResponse<CustomerResponse> createCustomer(
            @Valid @RequestBody CustomerRequest req
    ) {
        return ApiResponse.success(customerService.createCustomer(req));
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
    @Auditable(action = AuditAction.UPDATE, entityName = "Customer", actionDescription = "Cập nhật khách hàng")
    public ApiResponse<CustomerResponse> updateCustomer(
            @PathVariable Long id,
            @Valid @RequestBody CustomerRequest req
    ) {
        String actor = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiResponse.success(customerService.updateCustomer(id, req, actor));
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
    @Auditable(action = AuditAction.DEACTIVATE, entityName = "Customer", actionDescription = "Vô hiệu hóa khách hàng")
    public ApiResponse<Void> deactivateCustomer(
            @PathVariable Long id
    ) {
        customerService.deactivateCustomer(id);
        return ApiResponse.success(null);
    }

    /**
     * UC-CUST-05b: Kích hoạt lại khách hàng (Re-activate).
     *
     * @param id             ID khách hàng
     * @param servletRequest HTTP request (lấy IP)
     */
    @PatchMapping("/{id}/activate")
    @Operation(summary = "Kích hoạt lại khách hàng (UC-CUST-05b)")
    @PreAuthorize("hasAuthority('customer:edit')")
    @Auditable(action = AuditAction.ACTIVATE, entityName = "Customer", actionDescription = "Kích hoạt lại khách hàng")
    public ApiResponse<Void> activateCustomer(
            @PathVariable Long id
    ) {
        customerService.activateCustomer(id);
        return ApiResponse.success(null);
    }

}
