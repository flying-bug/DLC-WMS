package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "DEVICE_COMPONENT_SERIALS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeviceComponentSerial {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_assembly_order_id")
    private AssemblyOrder sourceAssemblyOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "removed_by_assembly_order_id")
    private AssemblyOrder removedByAssemblyOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_variant_id", nullable = false)
    private ProductVariant targetVariant;

    @Column(name = "target_serial", nullable = false, length = 100)
    private String targetSerial;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "component_variant_id", nullable = false)
    private ProductVariant componentVariant;

    @Column(name = "component_serial", nullable = false, length = 100)
    private String componentSerial;

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "installed_at")
    private LocalDateTime installedAt;

    @Column(name = "removed_at")
    private LocalDateTime removedAt;

    @Column(name = "source_repair_id")
    private Long sourceRepairId;

    @Column(name = "removed_by_repair_id")
    private Long removedByRepairId;

    @Column(name = "replaced_by_serial", length = 100)
    private String replacedBySerial;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_by")
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
