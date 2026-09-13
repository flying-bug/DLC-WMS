package com.duylongtech.backend.feature.brand;

import com.duylongtech.backend.enums.DocumentStatus;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * Entity ánh xạ bảng BRANDS trong database.
 * <p>
 * Thương hiệu / Nhà sản xuất (Brand / Manufacturer) - quản lý nhà sản xuất cho sản phẩm.
 * Theo FR 3.7 Brand Management trong report3.txt.
 * <p>
 * BR-11: Không xóa vật lý nếu đã có sản phẩm liên kết → chỉ đổi status INACTIVE.
 */
@Entity
@Table(name = "BRANDS")
@Getter
@NoArgsConstructor
public class Brand {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 20)
    private String status = DocumentStatus.APPROVED.name();

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "hotline", length = 20)
    private String hotline;

    @Column(name = "contact_email", length = 100)
    private String contactEmail;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // --- Domain Business Logic ---

    public void initBrand(String code, String name, String status, String description, String hotline, String contactEmail) {
        this.code = code;
        this.name = name;
        this.status = status != null ? status : DocumentStatus.APPROVED.name();
        this.description = description;
        this.hotline = hotline;
        this.contactEmail = contactEmail;
    }

    /**
     * Khởi tạo Brand mới với các ràng buộc cơ bản
     */
    public void assignInitialCode(String newCode) {
        if (this.code != null && !this.code.isBlank()) {
            throw new com.duylongtech.backend.exception.BusinessException(com.duylongtech.backend.constant.SystemMessage.BRAND_CODE_NOT_MODIFIABLE);
        }
        this.code = newCode;
    }

    /**
     * Cập nhật thông tin chi tiết của Brand
     */
    public void updateDetails(String newName, String newDescription, String newHotline, String newEmail) {
        if (newName != null && !newName.isBlank()) {
            this.name = newName.trim();
        }
        if (newDescription != null) {
            this.description = newDescription.trim().isEmpty() ? null : newDescription.trim();
        }
        if (newHotline != null) {
            this.hotline = newHotline.trim().isEmpty() ? null : newHotline.trim();
        }
        if (newEmail != null) {
            this.contactEmail = newEmail.trim().isEmpty() ? null : newEmail.trim();
        }
    }

    /**
     * Vô hiệu hóa Brand (chuyển sang INACTIVE) khi xóa mềm
     */
    public void deactivate() {
        this.status = com.duylongtech.backend.enums.EntityStatus.INACTIVE.name();
    }

    /**
     * Cập nhật trạng thái
     */
    public void changeStatus(String newStatus) {
        if (newStatus == null || newStatus.isBlank()) return;
        String normalized = newStatus.toUpperCase().trim();
        if (!Set.of(DocumentStatus.APPROVED.name(), com.duylongtech.backend.enums.EntityStatus.INACTIVE.name()).contains(normalized)) {
            throw new com.duylongtech.backend.exception.BusinessException(com.duylongtech.backend.constant.SystemMessage.BRAND_INVALID_STATUS);
        }
        this.status = normalized;
    }
}
