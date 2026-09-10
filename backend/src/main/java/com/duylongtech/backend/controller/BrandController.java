package com.duylongtech.backend.controller;

import com.duylongtech.backend.annotation.Auditable;
import com.duylongtech.backend.enums.AuditAction;
import com.duylongtech.backend.dto.request.BrandRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.BrandResponse;
import com.duylongtech.backend.service.BrandService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(required = false) String keyword
    ) {
        String actualKeyword = (search != null && !search.isBlank()) ? search : keyword;
        return ApiResponse.success(brandService.getAllBrands(actualKeyword));
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
    @Auditable(action = AuditAction.CREATE, entityName = "Brand", actionDescription = "Tạo thương hiệu")
    public ApiResponse<BrandResponse> createBrand(@Valid @RequestBody BrandRequest req) {
        return ApiResponse.success(brandService.createBrand(req));
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
    @Auditable(action = AuditAction.UPDATE, entityName = "Brand", actionDescription = "Cập nhật thương hiệu")
    public ApiResponse<BrandResponse> updateBrand(
            @PathVariable Long id,
            @Valid @RequestBody BrandRequest req
    ) {
        return ApiResponse.success(brandService.updateBrand(id, req));
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
    @Auditable(action = AuditAction.DELETE, entityName = "Brand", actionDescription = "Xóa thương hiệu")
    public org.springframework.http.ResponseEntity<ApiResponse<Void>> deleteBrand(@PathVariable Long id) {
        boolean isHardDeleted = brandService.deleteBrand(id);
        if (!isHardDeleted) {
            // Soft deleted
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT).body(ApiResponse.error(
                    com.duylongtech.backend.constant.SystemMessage.BRAND_INVALID_STATUS.getCode(), "Không thể xóa thương hiệu này vì đang có dữ liệu sản phẩm/bảo hành liên quan."));
        }
        return org.springframework.http.ResponseEntity.ok(ApiResponse.success(null));
    }
}
