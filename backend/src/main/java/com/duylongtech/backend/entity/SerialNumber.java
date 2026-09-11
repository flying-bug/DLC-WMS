package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "SERIAL_NUMBERS", uniqueConstraints = {
        @UniqueConstraint(name = "uk_serial_variant_normalized", columnNames = {"variant_id", "normalized_serial_number"}),
        @UniqueConstraint(name = "uk_serial_asset_tag", columnNames = "asset_tag")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SerialNumber {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "variant_id", nullable = false)
    private Long variantId;

    @Column(name = "warehouse_id", nullable = false)
    private Long warehouseId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id", insertable = false, updatable = false)
    private ProductVariant variant;

    @Column(name = "serial_number", nullable = false, length = 100)
    private String serialNumber;

    @Column(name = "normalized_serial_number", nullable = false, length = 100)
    private String normalizedSerialNumber;

    @Column(name = "asset_tag", nullable = false, length = 40)
    private String assetTag;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "purchase_order_line_id")
    private Long purchaseOrderLineId;

    @Column(name = "sales_order_line_id")
    private Long salesOrderLineId;

    @Column(name = "imported_at")
    private LocalDateTime importedAt;

    @Column(name = "sold_at")
    private LocalDateTime soldAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_order_line_id", insertable = false, updatable = false)
    private SalesOrderLine salesOrderLine;

    @PrePersist
    @PreUpdate
    void normalizeIdentity() {
        normalizedSerialNumber = normalizeSerial(serialNumber);
        if (assetTag == null || assetTag.isBlank()) {
            assetTag = "DLC-" + UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ROOT);
        } else {
            assetTag = assetTag.trim().toUpperCase(Locale.ROOT);
        }
    }

    public static String normalizeSerial(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }
}
