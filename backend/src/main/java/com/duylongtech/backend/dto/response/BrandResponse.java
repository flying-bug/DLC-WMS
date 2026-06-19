package com.duylongtech.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Response DTO cho Thương Hiệu (Brand Management).
 * <p>
 * Ánh xạ từ entity Brand để trả về qua API.
 * Các trường được hiển thị theo FR 3.7.1 (Brand List) và FR 3.7.2 (Brand Details).
 * <p>
 * Hiển thị trong danh sách: Mã NSX, Tên nhà sản xuất, Trạng thái, Ngày tạo.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BrandResponse {

    /**
     * ID nội bộ của thương hiệu trong database.
     */
    private Long id;

    /**
     * Mã thương hiệu / nhà sản xuất (Mã NSX).
     * Ví dụ: NSX-0001, NSX-ASUS, DELL
     */
    private String code;

    /**
     * Tên thương hiệu / nhà sản xuất (Tên thương hiệu).
     * Ví dụ: Dell, HP, Asus, Logitech
     */
    private String name;

    /**
     * Trạng thái hoạt động: APPROVED | INACTIVE.
     */
    private String status;

    /**
     * Mô tả thêm về thương hiệu / nhà sản xuất.
     */
    private String description;

    /**
     * Hotline liên hệ thương hiệu.
     */
    private String hotline;

    /**
     * Email liên hệ thương hiệu.
     */
    private String contactEmail;

    /**
     * Thời điểm tạo bản ghi (Ngày tạo).
     */
    private LocalDateTime createdAt;

    /**
     * Thời điểm cập nhật lần cuối.
     */
    private LocalDateTime updatedAt;
}
