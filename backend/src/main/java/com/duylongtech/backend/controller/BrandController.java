package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.BrandRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.BrandResponse;
import com.duylongtech.backend.service.AuditLogService;
import com.duylongtech.backend.service.BrandService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller xử lý các API Quản lý Thương Hiệu / Nhà Sản Xuất (Brand Management).
 *
 * <p>Base URL: /api/v1/brands
 *
 * <p>Các endpoint:
 * <ul>
 *   <li>GET    /api/v1/brands         - UC-36: Xem danh sách thương hiệu</li>
 *   <li>GET    /api/v1/brands/{id}    - UC-37: Xem chi tiết thương hiệu</li>
 *   <li>POST   /api/v1/brands         - UC-38: Tạo mới thương hiệu</li>
 *   <li>PUT    /api/v1/brands/{id}    - UC-39: Cập nhật thương hiệu</li>
 *   <li>DELETE /api/v1/brands/{id}    - UC-40: Xóa thương hiệu</li>
 * </ul>
 *
 * <p>Quyền truy cập (theo Screen Authorization - Table 03 trong report3.txt):
 * <ul>
 *   <li>Manager: full quyền (brand:view, brand:add, brand:edit, brand:delete)</li>
 *   <li>Staff: tùy phân quyền chi tiết</li>
 *   <li>Super Admin: KHÔNG có quyền truy cập Brand Management (chỉ quản lý tài khoản)</li>
 * </ul>
 *
 * <p>BR-06: Mọi thao tác CUD đều được tự động ghi Audit Log.
 */
@RestController
@RequestMapping("/api/v1/brands")
@RequiredArgsConstructor
@Tag(name = "Brand Management", description = "API quản lý thương hiệu / nhà sản xuất - UC-36 đến UC-40")
public class BrandController {

    private final BrandService brandService;
    private final AuditLogService auditLogService;

    // ─────────────────────────────────────────────────────────────────────────
    // UTILITY
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Lấy IP client từ header (hỗ trợ proxy / load balancer).
     */
    private String getClientIp(HttpServletRequest request) {
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
     * Lấy username của user đang đăng nhập từ SecurityContext.
     */
    private String getCurrentUser() {
        return org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // READ - UC-36, UC-37
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-36: Xem danh sách thương hiệu / nhà sản xuất.
     * <p>
     * Hỗ trợ tìm kiếm theo keyword (tên thương hiệu hoặc mã NSX).
     * Tương ứng với Search Input Bar "Nhập tìm kiếm tên nhà sản xuất..." trong FR 3.7.1.
     *
     * @param keyword từ khóa tìm kiếm (optional, null → trả về toàn bộ danh sách)
     * @return danh sách thương hiệu
     */
    @GetMapping
    @Operation(summary = "Xem danh sách thương hiệu (UC-36)")
    @PreAuthorize("hasRole('MANAGER') or hasRole('SUPER_ADMIN') or hasAuthority('brand:view')")
    public ApiResponse<List<BrandResponse>> getAllBrands(
            @RequestParam(required = false) String keyword
    ) {
        return ApiResponse.success(brandService.getAllBrands(keyword));
    }

    /**
     * UC-37: Xem chi tiết thương hiệu theo ID.
     * <p>
     * Được gọi khi user click vào một bản ghi trong data grid để xem thông tin chi tiết.
     * Tương ứng với FR 3.7.2 View Brand Details.
     *
     * @param id ID nội bộ của thương hiệu
     * @return chi tiết thương hiệu
     */
    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết thương hiệu (UC-37)")
    @PreAuthorize("hasRole('MANAGER') or hasRole('SUPER_ADMIN') or hasAuthority('brand:view')")
    public ApiResponse<BrandResponse> getBrandById(@PathVariable Long id) {
        return ApiResponse.success(brandService.getBrandById(id));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE - UC-38
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-38: Tạo mới thương hiệu / nhà sản xuất.
     * <p>
     * Validation:
     * <ul>
     *   <li>Tên thương hiệu bắt buộc (BRD03): "Tên thương hiệu không được để trống"</li>
     *   <li>BR-09: Mã NSX phải unique trên toàn hệ thống (BRD02)</li>
     *   <li>Mã NSX tự động sinh nếu không truyền</li>
     * </ul>
     * <p>
     * Tương ứng với form "Thêm thương hiệu mới" (FR 3.7.3 Create Brand).
     * <p>
     * BR-06: Ghi Audit Log thành công / thất bại.
     *
     * @param req            dữ liệu thương hiệu mới
     * @param servletRequest HTTP request (lấy IP client cho Audit Log)
     * @return thương hiệu vừa tạo
     */
    @PostMapping
    @Operation(summary = "Tạo mới thương hiệu (UC-38)")
    @PreAuthorize("hasRole('MANAGER') or hasAuthority('brand:add')")
    public ApiResponse<BrandResponse> createBrand(
            @Valid @RequestBody BrandRequest req,
            HttpServletRequest servletRequest
    ) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            BrandResponse created = brandService.createBrand(req);
            // BR-06: Ghi audit log thành công
            auditLogService.logEvent(
                    actor, "CREATE", "Brand", created.getId(),
                    "SUCCESS", "Tạo thương hiệu: " + created.getName() + " (" + created.getCode() + ")",
                    ip, null
            );
            return ApiResponse.success(created);
        } catch (Exception e) {
            // BR-06: Ghi audit log thất bại
            auditLogService.logEvent(
                    actor, "CREATE", "Brand", null,
                    "FAILED", "Tạo thương hiệu thất bại: " + e.getMessage(),
                    ip, null
            );
            throw e;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE - UC-39
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-39: Cập nhật thông tin thương hiệu.
     * <p>
     * Validation:
     * <ul>
     *   <li>Thương hiệu phải tồn tại (BRD01)</li>
     *   <li>FR 3.7.4: Mã NSX là read-only, không được thay đổi (BRD06)</li>
     *   <li>Tên thương hiệu bắt buộc nếu được gửi lên</li>
     * </ul>
     * <p>
     * Tương ứng với form "Chỉnh sửa thương hiệu" (FR 3.7.4 Update Brand).
     * <p>
     * BR-06: Ghi Audit Log thành công / thất bại.
     *
     * @param id             ID thương hiệu cần cập nhật
     * @param req            dữ liệu cập nhật
     * @param servletRequest HTTP request (lấy IP client cho Audit Log)
     * @return thương hiệu sau khi cập nhật
     */
    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật thương hiệu (UC-39)")
    @PreAuthorize("hasRole('MANAGER') or hasAuthority('brand:edit')")
    public ApiResponse<BrandResponse> updateBrand(
            @PathVariable Long id,
            @Valid @RequestBody BrandRequest req,
            HttpServletRequest servletRequest
    ) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            BrandResponse updated = brandService.updateBrand(id, req);
            // BR-06: Ghi audit log thành công
            auditLogService.logEvent(
                    actor, "UPDATE", "Brand", id,
                    "SUCCESS", "Cập nhật thương hiệu: " + updated.getName() + " (" + updated.getCode() + ")",
                    ip, null
            );
            return ApiResponse.success(updated);
        } catch (Exception e) {
            // BR-06: Ghi audit log thất bại
            auditLogService.logEvent(
                    actor, "UPDATE", "Brand", id,
                    "FAILED", "Cập nhật thương hiệu ID " + id + " thất bại: " + e.getMessage(),
                    ip, null
            );
            throw e;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE - UC-40
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-40: Xóa thương hiệu / nhà sản xuất.
     * <p>
     * Referential Integrity Check (FR 3.7.5 Delete Brand):
     * <ul>
     *   <li>Happy Path: Nếu chưa có sản phẩm liên kết → xóa vật lý, trả về thành công.</li>
     *   <li>Exception Case: Nếu đang có sản phẩm / bảo hành liên kết → đổi sang INACTIVE,
     *       trả lỗi BRD04: "Không thể xóa thương hiệu này vì đang có dữ liệu sản phẩm/bảo hành liên quan."</li>
     * </ul>
     * <p>
     * Tương ứng với modal "Xác nhận xóa Thương hiệu" (FR 3.7.5).
     * <p>
     * BR-06: Ghi Audit Log thành công / thất bại.
     *
     * @param id             ID thương hiệu cần xóa
     * @param servletRequest HTTP request (lấy IP client cho Audit Log)
     * @return thông báo thành công
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa thương hiệu (UC-40)")
    @PreAuthorize("hasRole('MANAGER') or hasAuthority('brand:delete')")
    public ApiResponse<Void> deleteBrand(
            @PathVariable Long id,
            HttpServletRequest servletRequest
    ) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            brandService.deleteBrand(id);
            // BR-06: Ghi audit log thành công
            auditLogService.logEvent(
                    actor, "DELETE", "Brand", id,
                    "SUCCESS", "Xóa / Vô hiệu hóa thương hiệu ID: " + id,
                    ip, null
            );
            return ApiResponse.success(null);
        } catch (Exception e) {
            // BR-06: Ghi audit log thất bại
            auditLogService.logEvent(
                    actor, "DELETE", "Brand", id,
                    "FAILED", "Xóa thương hiệu ID " + id + " thất bại: " + e.getMessage(),
                    ip, null
            );
            throw e;
        }
    }
}
