package com.duylongtech.backend.feature.assembly;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.duylongtech.backend.enums.SerialInstallStatus;
import java.time.LocalDateTime;
import com.duylongtech.backend.feature.product.ProductVariant;

@Entity
@Table(name = "DEVICE_COMPONENT_SERIALS")
@Getter
@Setter
@NoArgsConstructor
public class DeviceComponentSerial {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Setter(AccessLevel.NONE)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_assembly_order_id")
    private AssemblyOrder sourceAssemblyOrder;

    @Setter(AccessLevel.NONE)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "removed_by_assembly_order_id")
    private AssemblyOrder removedByAssemblyOrder;

    @Setter(AccessLevel.NONE)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_variant_id", nullable = false)
    private ProductVariant targetVariant;

    @Setter(AccessLevel.NONE)
    @Column(name = "target_serial", nullable = false, length = 100)
    private String targetSerial;

    @Setter(AccessLevel.NONE)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "component_variant_id", nullable = false)
    private ProductVariant componentVariant;

    @Setter(AccessLevel.NONE)
    @Column(name = "component_serial", nullable = false, length = 100)
    private String componentSerial;

    @Setter(AccessLevel.NONE)
    @Column(name = "status", nullable = false, length = 30)
        private String status = SerialInstallStatus.ACTIVE.name();

    @Setter(AccessLevel.NONE)
    @Column(name = "installed_at")
    private LocalDateTime installedAt;

    @Setter(AccessLevel.NONE)
    @Column(name = "removed_at")
    private LocalDateTime removedAt;

    @Column(name = "source_repair_id")
    private Long sourceRepairId;

    @Setter(AccessLevel.NONE)
    @Column(name = "removed_by_repair_id")
    private Long removedByRepairId;

    @Setter(AccessLevel.NONE)
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

    public void initSerial(AssemblyOrder sourceAssemblyOrder, ProductVariant targetVariant, String targetSerial, ProductVariant componentVariant, String componentSerial, Long creatorId) {
        this.sourceAssemblyOrder = sourceAssemblyOrder;
        this.targetVariant = targetVariant;
        this.targetSerial = targetSerial;
        this.componentVariant = componentVariant;
        this.componentSerial = componentSerial;
        this.createdBy = creatorId;
        this.status = SerialInstallStatus.ACTIVE.name();
        this.installedAt = LocalDateTime.now();
    }

    public void initDisassemblySerial(AssemblyOrder order, ProductVariant targetVariant, String targetSerial, ProductVariant componentVariant, String componentSerial, Long creatorId, String note) {
        this.sourceAssemblyOrder = order;
        this.removedByAssemblyOrder = order;
        this.targetVariant = targetVariant;
        this.targetSerial = targetSerial;
        this.componentVariant = componentVariant;
        this.componentSerial = componentSerial;
        this.createdBy = creatorId;
        this.status = SerialInstallStatus.REMOVED.name();
        this.removedAt = LocalDateTime.now();
        this.note = note;
    }

    public void initForRepair(AssemblyOrder sourceOrder, ProductVariant targetVariant, String targetSerial, ProductVariant componentVariant, String componentSerial, Long repairId, String note, Long creatorId) {
        this.sourceAssemblyOrder = sourceOrder;
        this.targetVariant = targetVariant;
        this.targetSerial = targetSerial;
        this.componentVariant = componentVariant;
        this.componentSerial = componentSerial;
        this.sourceRepairId = repairId;
        this.note = note;
        this.createdBy = creatorId;
        this.status = SerialInstallStatus.ACTIVE.name();
        this.installedAt = LocalDateTime.now();
    }

    public void markAsRemoved(Long repairId, AssemblyOrder removedByAssemblyOrder, String note) {
        if (!SerialInstallStatus.ACTIVE.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ Serial ACTIVE mới có thể được tháo");
        }
        this.status = SerialInstallStatus.REMOVED.name();
        this.removedAt = LocalDateTime.now();
        this.removedByRepairId = repairId;
        this.removedByAssemblyOrder = removedByAssemblyOrder;
        this.note = note;
    }

    public void markAsReplaced(String replacedBySerial) {
        this.replacedBySerial = replacedBySerial;
    }
}
