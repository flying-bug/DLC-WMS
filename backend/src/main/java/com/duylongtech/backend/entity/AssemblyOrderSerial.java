package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assembly_order_id", nullable = false)
    private AssemblyOrder assemblyOrder;

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

    @Column(name = "created_by")
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
