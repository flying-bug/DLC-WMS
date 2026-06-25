package com.duylongtech.backend.dto.request;

import com.duylongtech.backend.constant.AppConstants;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request DTO cho tạo mới / cập nhật Khách hàng (Customer).
 *
 * <p>Validation rules theo data-model.md và clarify.md:
 * <ul>
 *   <li>Tên: bắt buộc, tối đa 150 ký tự.</li>
 *   <li>SĐT: validate bằng MOBILE_REGEX từ AppConstants (quyết định Issue #7).</li>
 *   <li>Email: optional, validate định dạng, tối đa 100 ký tự.</li>
 *   <li>Address: optional, UI rào 1000 ký tự, free-text (quyết định Issue #3).</li>
 * </ul>
 */
@Data
public class CustomerRequest {

    /**
     * Tên khách hàng (bắt buộc).
     */
    @NotBlank(message = "FIELD_REQUIRED")
    @Size(max = 150, message = "EXCEED_MAX_LENGTH")
    private String name;

    /**
     * Số điện thoại - định danh duy nhất, validate mạng Việt Nam.
     * Bắt buộc khi tạo mới.
     */
    @NotBlank(message = "FIELD_REQUIRED")
    @Pattern(regexp = AppConstants.MOBILE_REGEX, message = "INVALID_PHONE")
    private String phone;

    /**
     * Địa chỉ email (optional).
     */
    @Email(message = "INVALID_EMAIL")
    @Size(max = 100, message = "EXCEED_MAX_LENGTH")
    private String email;

    /**
     * Địa chỉ tự do (optional, free-text per clarify.md Issue #3).
     */
    @Size(max = 1000, message = "EXCEED_MAX_LENGTH")
    private String address;

    /**
     * Nhóm khách hàng: RETAIL | WHOLESALE | DISTRIBUTOR.
     * Mặc định: RETAIL.
     */
    private String groupType;
}
