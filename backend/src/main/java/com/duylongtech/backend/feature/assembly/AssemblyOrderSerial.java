package com.duylongtech.backend.feature.assembly;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import com.duylongtech.backend.feature.product.ProductVariant;

@Entity
@Table(name = "ASSEMBLY_ORDER_SERIALS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssemblyOrderSerial {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Setter(AccessLevel.NONE)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assembly_order_id", nullable = false)
    private AssemblyOrder assemblyOrder;

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
    @Builder.Default
    private String status = com.duylongtech.backend.enums.EntityStatus.ACTIVE.name();

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

    public void initSerial(AssemblyOrder assemblyOrder, ProductVariant targetVariant, String targetSerial, ProductVariant componentVariant, String componentSerial, Long creatorId) {
        this.assemblyOrder = assemblyOrder;
        this.targetVariant = targetVariant;
        this.targetSerial = targetSerial;
        this.componentVariant = componentVariant;
        this.componentSerial = componentSerial;
        this.createdBy = creatorId;
        this.status = com.duylongtech.backend.enums.EntityStatus.ACTIVE.name();
        this.installedAt = LocalDateTime.now();
    }

    public void markAsRemoved(Long repairId, String note) {
        if (!com.duylongtech.backend.enums.EntityStatus.ACTIVE.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ Serial ACTIVE mới có thể được tháo");
        }
        this.status = "REMOVED";
        this.removedAt = LocalDateTime.now();
        this.removedByRepairId = repairId;
        this.note = note;
    }

    public void markAsReplaced(String replacedBySerial) {
        this.replacedBySerial = replacedBySerial;
    }
}
