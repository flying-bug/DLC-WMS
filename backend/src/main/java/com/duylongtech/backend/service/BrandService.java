package com.duylongtech.backend.service;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.BrandRequest;
import com.duylongtech.backend.dto.response.BrandResponse;
import com.duylongtech.backend.entity.Brand;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service xử lý nghiệp vụ Quản lý Thương Hiệu / Nhà Sản Xuất (Brand Management).
 *
 * <p>Các Use Case được implement:
 * <ul>
 *   <li>UC-36: View Brand List      → {@link #getAllBrands(String)}</li>
 *   <li>UC-37: View Brand Details   → {@link #getBrandById(Long)}</li>
 *   <li>UC-38: Create Brand         → {@link #createBrand(BrandRequest)}</li>
 *   <li>UC-39: Update Brand         → {@link #updateBrand(Long, BrandRequest)}</li>
 *   <li>UC-40: Delete Brand         → {@link #deleteBrand(Long)}</li>
 * </ul>
 *
 * <p>Business Rules áp dụng:
 * <ul>
 *   <li>BR-06: Mọi CUD đều bắt buộc ghi Audit Log (thực hiện bởi BrandController).</li>
 *   <li>BR-09: Mã thương hiệu (Mã NSX) phải unique trên toàn hệ thống.</li>
 *   <li>BR-11: Không xóa vật lý nếu đã có sản phẩm liên kết → chỉ đổi status INACTIVE.</li>
 * </ul>
 *
 * <p>Tham chiếu FR 3.7 (Brand Management) trong report3.txt.
 */
@Service
@RequiredArgsConstructor
public class BrandService {

    private static final String APPROVED = "APPROVED";
    private static final String INACTIVE  = "INACTIVE";
    private static final Set<String> VALID_STATUSES = Set.of(APPROVED, INACTIVE);

    /** Prefix tự động sinh mã NSX nếu client không truyền code. */
    private static final String CODE_PREFIX = "NSX-";

    private final BrandRepository brandRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // READ
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-36: Lấy danh sách tất cả thương hiệu, hỗ trợ tìm kiếm theo keyword.
     *
     * <p>Tìm kiếm theo tên hoặc mã NSX (case-insensitive).
     * Nếu keyword null/rỗng → trả về toàn bộ danh sách.
     *
     * @param keyword từ khóa tìm theo tên thương hiệu hoặc mã NSX (optional)
     * @return danh sách {@link BrandResponse}
     */
    @Transactional(readOnly = true)
    public List<BrandResponse> getAllBrands(String keyword) {
        String normalizedKeyword = trimToNull(keyword);
        List<Brand> brands = (normalizedKeyword == null)
                ? brandRepository.findAllOrderByCreatedAtDesc()
                : brandRepository.searchBrands(normalizedKeyword);
        return brands.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * UC-37: Lấy chi tiết thương hiệu theo ID.
     *
     * @param id ID của thương hiệu
     * @return {@link BrandResponse}
     * @throws BusinessException nếu không tìm thấy
     */
    @Transactional(readOnly = true)
    public BrandResponse getBrandById(Long id) {
        Brand brand = findBrandOrThrow(id);
        return toResponse(brand);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-38: Tạo mới thương hiệu / nhà sản xuất.
     *
     * <p>Validation:
     * <ul>
     *   <li>Tên thương hiệu bắt buộc (validate bởi @NotBlank trong BrandRequest)</li>
     *   <li>BR-09: Mã NSX phải unique; tự động sinh nếu không truyền</li>
     * </ul>
     *
     * @param req dữ liệu tạo mới từ client
     * @return {@link BrandResponse} sau khi lưu
     */
    @Transactional
    public BrandResponse createBrand(BrandRequest req) {
        // Resolve và validate mã NSX
        String code = resolveCode(req.getCode());

        Brand brand = Brand.builder()
                .code(code)
                .name(req.getName().trim())
                .status(APPROVED)
                .description(trimToNull(req.getDescription()))
                .hotline(trimToNull(req.getHotline()))
                .contactEmail(trimToNull(req.getContactEmail()))
                .build();

        return toResponse(brandRepository.save(brand));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-39: Cập nhật thông tin thương hiệu.
     *
     * <p>Validation:
     * <ul>
     *   <li>Thương hiệu phải tồn tại trong hệ thống</li>
     *   <li>FR 3.7.4: Mã NSX là read-only, không được phép thay đổi sau khi tạo (BRD06)</li>
     *   <li>Tên thương hiệu bắt buộc (không được để trống)</li>
     *   <li>Status chỉ chấp nhận APPROVED hoặc INACTIVE</li>
     * </ul>
     *
     * @param id  ID thương hiệu cần cập nhật
     * @param req dữ liệu cập nhật từ client
     * @return {@link BrandResponse} sau khi lưu
     */
    @Transactional
    public BrandResponse updateBrand(Long id, BrandRequest req) {
        Brand brand = findBrandOrThrow(id);

        // FR 3.7.4: Mã NSX không được thay đổi sau khi tạo
        // Nếu client gửi kèm code khác với code hiện tại → báo lỗi
        String requestedCode = trimToNull(req.getCode());
        if (requestedCode != null && !requestedCode.equalsIgnoreCase(brand.getCode())) {
            throw new BusinessException(SystemMessage.BRAND_CODE_NOT_MODIFIABLE.getMessage());
        }

        // Cập nhật tên thương hiệu (bắt buộc)
        if (req.getName() != null && !req.getName().isBlank()) {
            brand.setName(req.getName().trim());
        }

        // Cập nhật trạng thái nếu được gửi
        if (req.getStatus() != null) {
            brand.setStatus(resolveStatus(req.getStatus()));
        }

        // Cập nhật mô tả
        if (req.getDescription() != null) {
            brand.setDescription(trimToNull(req.getDescription()));
        }

        // Cập nhật hotline
        if (req.getHotline() != null) {
            brand.setHotline(trimToNull(req.getHotline()));
        }

        // Cập nhật email liên hệ
        if (req.getContactEmail() != null) {
            brand.setContactEmail(trimToNull(req.getContactEmail()));
        }

        return toResponse(brandRepository.save(brand));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-40: Xóa thương hiệu / nhà sản xuất.
     *
     * <p>BR-11: Referential Integrity Check (FR 3.7.5):
     * <ul>
     *   <li>Nếu thương hiệu đang được liên kết với sản phẩm → chỉ đổi status INACTIVE, không xóa vật lý.</li>
     *   <li>Exception Case: trả về {@code BRD04} với thông báo "Không thể xóa thương hiệu này vì đang có dữ liệu sản phẩm/bảo hành liên quan."</li>
     *   <li>Happy Path: Nếu chưa có sản phẩm liên kết → xóa vật lý (hard delete).</li>
     * </ul>
     *
     * @param id ID thương hiệu cần xóa
     * @throws BusinessException nếu không tìm thấy hoặc đang có sản phẩm liên kết
     */
    @Transactional
    public boolean deleteBrand(Long id) {
        Brand brand = findBrandOrThrow(id);

        // BR-11: Kiểm tra liên kết với sản phẩm (Referential Integrity Check)
        long linkedProductCount = brandRepository.countLinkedProducts(brand.getId());

        if (linkedProductCount > 0) {
            // Có sản phẩm liên kết → chuyển status sang INACTIVE thay vì xóa vật lý
            brand.setStatus(INACTIVE);
            brandRepository.save(brand);
            return false; // Soft deleted
        } else {
            // Chưa có sản phẩm liên kết → xóa vật lý an toàn
            brandRepository.delete(brand);
            return true; // Hard deleted
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Tìm thương hiệu theo ID, ném ngoại lệ nếu không tìm thấy.
     *
     * @param id ID thương hiệu
     * @return entity Brand
     * @throws BusinessException BRD01 nếu không tìm thấy
     */
    private Brand findBrandOrThrow(Long id) {
        if (id == null) {
            throw new BusinessException(SystemMessage.BRAND_NOT_FOUND.getMessage());
        }
        return brandRepository.findById(id)
                .orElseThrow(() -> new BusinessException(SystemMessage.BRAND_NOT_FOUND.getMessage()));
    }

    /**
     * Resolve mã NSX: sinh tự động nếu null, kiểm tra unique (BR-09).
     *
     * <p>Format tự động sinh: NSX-{timestamp_millis}
     *
     * @param requestedCode mã do client truyền (có thể null)
     * @return mã đã được validate và sẵn sàng lưu
     * @throws BusinessException BRD02 nếu mã đã tồn tại
     */
    private String resolveCode(String requestedCode) {
        String code = trimToNull(requestedCode);
        if (code == null) {
            // Tự động sinh mã NSX theo timestamp
            code = CODE_PREFIX + System.currentTimeMillis();
        }
        // BR-09: Kiểm tra unique trên toàn hệ thống
        if (brandRepository.existsByCode(code)) {
            throw new BusinessException(SystemMessage.BRAND_CODE_EXISTS.getMessage());
        }
        return code;
    }

    /**
     * Validate và normalize status.
     *
     * <p>Chỉ chấp nhận: APPROVED | INACTIVE.
     *
     * @param status giá trị status từ client
     * @return status đã normalize uppercase
     * @throws BusinessException BRD05 nếu không hợp lệ
     */
    private String resolveStatus(String status) {
        if (status == null || status.isBlank()) {
            return APPROVED;
        }
        String normalized = status.toUpperCase().trim();
        if (!VALID_STATUSES.contains(normalized)) {
            throw new BusinessException(SystemMessage.BRAND_INVALID_STATUS.getMessage());
        }
        return normalized;
    }

    /**
     * Trim string, trả về null nếu rỗng sau trim.
     *
     * @param value chuỗi đầu vào
     * @return chuỗi trimmed hoặc null
     */
    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * Map Brand entity → BrandResponse DTO.
     *
     * @param brand entity cần map
     * @return response DTO
     */
    private BrandResponse toResponse(Brand brand) {
        return BrandResponse.builder()
                .id(brand.getId())
                .code(brand.getCode())
                .name(brand.getName())
                .status(brand.getStatus())
                .description(brand.getDescription())
                .hotline(brand.getHotline())
                .contactEmail(brand.getContactEmail())
                .createdAt(brand.getCreatedAt())
                .updatedAt(brand.getUpdatedAt())
                .build();
    }
}
