package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.SupplierRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.SupplierResponse;
import com.duylongtech.backend.service.AuditLogService;
import com.duylongtech.backend.service.SupplierService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller xử lý các API Quản lý Nhà Cung Cấp (Supplier Management).
 *
 * <p>Base URL: /api/v1/suppliers
 *
 * <p>Các endpoint:
 * <ul>
 *   <li>GET  /api/v1/suppliers          - UC-20: Xem danh sách NCC</li>
 *   <li>GET  /api/v1/suppliers/{id}     - UC-21: Xem chi tiết NCC</li>
 *   <li>POST /api/v1/suppliers          - UC-22: Tạo mới NCC</li>
 *   <li>PUT  /api/v1/suppliers/{id}     - UC-23: Cập nhật NCC</li>
 *   <li>DELETE /api/v1/suppliers/{id}   - UC-24: Xóa NCC</li>
 * </ul>
 *
 * <p>Quyền truy cập (theo DATABASE.md):
 * <ul>
 *   <li>Manager: full quyền (view, add, edit, delete)</li>
 *   <li>Staff: xem và thêm (supplier:view, supplier:add) tùy phân quyền</li>
 * </ul>
 *
 * <p>BR-06: Mọi thao tác CUD đều được tự động ghi Audit Log.
 */
@RestController
@RequestMapping("/api/v1/suppliers")
@RequiredArgsConstructor
@Tag(name = "Supplier Management", description = "API quản lý nhà cung cấp - UC20 đến UC24")
public class SupplierController {

    private final SupplierService supplierService;
    private final AuditLogService auditLogService;

    /**
     * Lấy IP client từ header (hỗ trợ proxy/load balancer).
     */
    private String getClientIp(jakarta.servlet.http.HttpServletRequest request) {
        String ipAddress = request.getHeader("X-Forwarded-For");
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getRemoteAddr();
        }
        if (ipAddress != null && ipAddress.contains(",")) {
            ipAddress = ipAddress.split(",")[0].trim();
        }
        return ipAddress;
    }

    /**
     * Lấy username của user đang đăng nhập.
     */
    private String getCurrentUser() {
        return org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // READ - UC-20, UC-21
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-20: Xem danh sách nhà cung cấp.
     * Hỗ trợ tìm kiếm theo keyword (tên hoặc mã NCC).
     *
     * @param keyword từ khóa tìm kiếm (optional)
     * @return danh sách nhà cung cấp
     */
    @GetMapping
    @Operation(summary = "Xem danh sách nhà cung cấp (UC-20)")
    @PreAuthorize("hasAuthority('supplier:view')")
    public ApiResponse<List<SupplierResponse>> getAllSuppliers(
            @RequestParam(required = false) String keyword
    ) {
        return ApiResponse.success(supplierService.getAllSuppliers(keyword));
    }

    /**
     * UC-21: Xem chi tiết nhà cung cấp theo ID.
     *
     * @param id ID nhà cung cấp
     * @return chi tiết nhà cung cấp
     */
    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết nhà cung cấp (UC-21)")
    @PreAuthorize("hasAuthority('supplier:view')")
    public ApiResponse<SupplierResponse> getSupplierById(@PathVariable Long id) {
        return ApiResponse.success(supplierService.getSupplierById(id));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE - UC-22
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-22: Tạo mới nhà cung cấp.
     * BR-06: Ghi Audit Log thành công / thất bại.
     * BR-09: Mã NCC phải unique (validate trong service).
     *
     * @param req             dữ liệu nhà cung cấp mới
     * @param servletRequest  HTTP request (lấy IP)
     * @return nhà cung cấp vừa tạo
     */
    @PostMapping
    @Operation(summary = "Tạo mới nhà cung cấp (UC-22)")
    @PreAuthorize("hasAuthority('supplier:add')")
    public ApiResponse<SupplierResponse> createSupplier(
            @Valid @RequestBody SupplierRequest req,
            jakarta.servlet.http.HttpServletRequest servletRequest
    ) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            SupplierResponse created = supplierService.createSupplier(req);
            // BR-06: Ghi audit log thành công
            auditLogService.logEvent(
                    actor, "CREATE", "Supplier", created.getId(),
                    "SUCCESS", "Tạo nhà cung cấp: " + created.getName() + " (" + created.getCode() + ")",
                    ip, null
            );
            return ApiResponse.success(created);
        } catch (Exception e) {
            // BR-06: Ghi audit log thất bại
            auditLogService.logEvent(
                    actor, "CREATE", "Supplier", null,
                    "FAILED", "Tạo nhà cung cấp thất bại: " + e.getMessage(),
                    ip, null
            );
            throw e;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE - UC-23
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-23: Cập nhật thông tin nhà cung cấp.
     * BR-06: Ghi Audit Log.
     * BR-09: Nếu đổi mã, mã mới phải unique.
     *
     * @param id              ID nhà cung cấp cần cập nhật
     * @param req             dữ liệu cập nhật
     * @param servletRequest  HTTP request (lấy IP)
     * @return nhà cung cấp sau khi cập nhật
     */
    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật nhà cung cấp (UC-23)")
    @PreAuthorize("hasAuthority('supplier:edit')")
    public ApiResponse<SupplierResponse> updateSupplier(
            @PathVariable Long id,
            @Valid @RequestBody SupplierRequest req,
            jakarta.servlet.http.HttpServletRequest servletRequest
    ) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            SupplierResponse updated = supplierService.updateSupplier(id, req);
            // BR-06: Ghi audit log thành công
            auditLogService.logEvent(
                    actor, "UPDATE", "Supplier", id,
                    "SUCCESS", "Cập nhật nhà cung cấp: " + updated.getName() + " (" + updated.getCode() + ")",
                    ip, null
            );
            return ApiResponse.success(updated);
        } catch (Exception e) {
            // BR-06: Ghi audit log thất bại
            auditLogService.logEvent(
                    actor, "UPDATE", "Supplier", id,
                    "FAILED", "Cập nhật nhà cung cấp ID " + id + " thất bại: " + e.getMessage(),
                    ip, null
            );
            throw e;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE - UC-24
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-24: Xóa nhà cung cấp.
     * BR-06: Ghi Audit Log.
     * BR-11: Nếu có giao dịch liên kết → chỉ đổi sang INACTIVE, không xóa vật lý.
     *        Nếu chưa có giao dịch → xóa vật lý.
     *
     * @param id              ID nhà cung cấp cần xóa
     * @param servletRequest  HTTP request (lấy IP)
     * @return thông báo thành công
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa nhà cung cấp (UC-24)")
    @PreAuthorize("hasAuthority('supplier:delete')")
    public ApiResponse<Void> deleteSupplier(
            @PathVariable Long id,
            jakarta.servlet.http.HttpServletRequest servletRequest
    ) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            supplierService.deleteSupplier(id);
            // BR-06: Ghi audit log thành công
            auditLogService.logEvent(
                    actor, "DELETE", "Supplier", id,
                    "SUCCESS", "Xóa/Vô hiệu hóa nhà cung cấp ID: " + id,
                    ip, null
            );
            return ApiResponse.success(null);
        } catch (Exception e) {
            // BR-06: Ghi audit log thất bại
            auditLogService.logEvent(
                    actor, "DELETE", "Supplier", id,
                    "FAILED", "Xóa nhà cung cấp ID " + id + " thất bại: " + e.getMessage(),
                    ip, null
            );
            throw e;
        }
    }
}
