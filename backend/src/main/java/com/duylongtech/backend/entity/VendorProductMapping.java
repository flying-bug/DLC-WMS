package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Lưu lịch sử mapping giữa tên hàng trên hóa đơn của nhà cung cấp và SKU trong hệ thống.
 * Dùng để cải thiện độ chính xác OCR theo thời gian (Learning from corrections).
 */
@Entity
@Table(name = "VENDOR_PRODUCT_MAPPINGS",
       uniqueConstraints = @UniqueConstraint(columnNames = {"partner_id", "vendor_product_name"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorProductMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nhà cung cấp (Partner với is_supplier = true) */
    @Column(name = "partner_id", nullable = false)
    private Long partnerId;

    /** Tên hàng trên hóa đơn của nhà cung cấp (OCR raw text, lowercase normalized) */
    @Column(name = "vendor_product_name", nullable = false, length = 500)
    private String vendorProductName;

    /** ID của ProductVariant khớp trong hệ thống */
    @Column(name = "product_variant_id", nullable = false)
    private Long productVariantId;

    /** Số lần mapping này được xác nhận (dùng để ưu tiên) */
    @Column(name = "confirm_count", nullable = false)
    @Builder.Default
    private Integer confirmCount = 1;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
