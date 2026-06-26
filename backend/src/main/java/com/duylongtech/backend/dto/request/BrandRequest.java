package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request DTO cho tạo mới / cập nhật Thương Hiệu (Brand Management).
 * <p>
 * Áp dụng validation theo CONTRIBUTING.md, FR 3.7 trong report3.txt và schema.sql BRANDS table.
 * <p>
 * Sử dụng cho:
 * <ul>
 *   <li>UC-38: Create Brand</li>
 *   <li>UC-39: Update Brand</li>
 * </ul>
 */
@Data
public class BrandRequest {

    /**
     * Mã thương hiệu / nhà sản xuất (Mã NSX) - optional, tự động sinh nếu null.
     * <p>
     * BR-09: Phải unique trên toàn hệ thống (validate trong service).
     * Độ dài tối đa 50 ký tự theo schema.sql.
     * Lưu ý: Khi Update, mã NSX là read-only (không được thay đổi) theo FR 3.7.4.
     */
    @Size(max = 50, message = "EXCEED_MAX_LENGTH")
    private String code;

    /**
     * Tên thương hiệu / nhà sản xuất (Tên thương hiệu) - bắt buộc.
     * <p>
     * Exception Case: Nếu để trống → validation message "Tên thương hiệu không được để trống".
     * Độ dài tối đa 100 ký tự theo schema.sql.
     */
    @NotBlank(message = "Tên thương hiệu không được để trống")
    @Size(max = 100, message = "EXCEED_MAX_LENGTH")
    private String name;

    /**
     * Trạng thái: APPROVED (Hoạt động) | INACTIVE (Ngừng hoạt động).
     * Mặc định là APPROVED khi tạo mới.
     */
    private String status;

    /**
     * Hotline liên hệ thương hiệu (theo FR 3.7.3 Create Brand).
     * Validate định dạng số điện thoại Việt Nam.
     */
    @Pattern(regexp = "^(0[3|5|7|8|9])+([0-9]{8})$", message = "INVALID_PHONE")
    private String hotline;

    /**
     * Email liên hệ thương hiệu (theo FR 3.7.3 Create Brand).
     */
    @Email(message = "INVALID_EMAIL")
    private String contactEmail;

    /**
     * Mô tả thêm về thương hiệu / nhà sản xuất (trường Mô tả).
     * Không giới hạn độ dài cứng nhưng nên có giới hạn hợp lý.
     */
    @Size(max = 1000, message = "EXCEED_MAX_LENGTH")
    private String description;
}
