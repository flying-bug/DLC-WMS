package com.duylongtech.backend.feature.repair;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Ảnh sửa chữa theo từng giai đoạn của lệnh sửa chữa.
 * phase: INTAKE (tiếp nhận), DIAGNOSIS (chẩn đoán), COMPLETION (hoàn thành)
 * locked: true khi lệnh đã chuyển qua phase tiếp theo (không cho xóa)
 */
@Entity
@Table(name = "REPAIR_PHOTOS")
@Getter
@Setter
@NoArgsConstructor
public class RepairPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "repair_id", nullable = false)
    private Long repairId;

    /** INTAKE | DIAGNOSIS | COMPLETION */
    @Column(name = "phase", nullable = false, length = 30)
    private String phase;

    /** Nhãn phân loại tùy chọn (ví dụ: FRONT, BACK, DETAIL, ...) */
    @Column(name = "category", length = 50)
    private String category;

    /** Cloudinary public_id để xóa ảnh sau này */
    @Column(name = "public_id", nullable = false, length = 255)
    private String publicId;

    /** URL bảo mật của Cloudinary */
    @Column(name = "secure_url", nullable = false, length = 2048)
    private String secureUrl;

    /** SHA-256 của file gốc để phát hiện trùng/giả mạo */
    @Column(name = "checksum", length = 64)
    private String checksum;

    /** Thời điểm upload (dùng làm watermark thông tin) */
    @Column(name = "watermarked_at")
    private LocalDateTime watermarkedAt;

    /** Người upload */
    @Column(name = "uploaded_by")
    private Long uploadedBy;

    /** Khi true: không cho xóa (lệnh đã chuyển bước) */
    @Column(name = "locked", nullable = false)
    private Boolean locked = false;

    /** Ghi chú mô tả ảnh */
    @Column(name = "caption", length = 500)
    private String caption;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public void init(Long repairId, String phase, String category, String publicId,
                     String secureUrl, String checksum, Long uploadedBy, String caption) {
        this.repairId = repairId;
        this.phase = phase;
        this.category = category;
        this.publicId = publicId;
        this.secureUrl = secureUrl;
        this.checksum = checksum;
        this.uploadedBy = uploadedBy;
        this.watermarkedAt = LocalDateTime.now();
        this.locked = false;
        this.caption = caption;
    }
}
