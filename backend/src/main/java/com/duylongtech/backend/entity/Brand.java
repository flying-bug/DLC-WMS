package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Entity ánh xạ bảng BRANDS trong database.
 * <p>
 * Thương hiệu / Nhà sản xuất (Brand / Manufacturer) - quản lý nhà sản xuất cho sản phẩm.
 * Theo FR 3.7 Brand Management trong report3.txt.
 * <p>
 * Liên kết: {@link Product} (brand_id FK) - một thương hiệu có thể có nhiều sản phẩm.
 * BR-11: Không xóa vật lý nếu đã có sản phẩm liên kết → chỉ đổi status INACTIVE.
 */
@Entity
@Table(name = "BRANDS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Brand {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Mã thương hiệu / nhà sản xuất (Mã NSX).
     * BR-09: Unique trên toàn hệ thống. Tối đa 50 ký tự.
     */
    @Column(nullable = false, unique = true, length = 50)
    private String code;

    /**
     * Tên chính thức của thương hiệu (Tên thương hiệu).
     * Ví dụ: Dell, HP, Asus. Tối đa 100 ký tự.
     */
    @Column(nullable = false, length = 100)
    private String name;

    /**
     * Trạng thái: APPROVED (Hoạt động) | INACTIVE (Ngừng hoạt động).
     * Mặc định APPROVED khi tạo mới.
     */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "APPROVED";

    /**
     * Mô tả thêm về thương hiệu / nhà sản xuất (Mô tả).
     * Theo FR 3.7.3: trường Mô tả là optional.
     */
    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * Hotline liên hệ thương hiệu.
     * Theo FR 3.7.3 Create Brand - trường Hotline.
     */
    @Column(name = "hotline", length = 20)
    private String hotline;

    /**
     * Email liên hệ thương hiệu.
     * Theo FR 3.7.3 Create Brand - trường Email liên hệ.
     */
    @Column(name = "contact_email", length = 100)
    private String contactEmail;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
