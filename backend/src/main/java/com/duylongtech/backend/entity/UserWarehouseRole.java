package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "USER_WAREHOUSE_ROLES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserWarehouseRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "warehouse_id", nullable = false)
    private Long warehouseId;

    @Column(name = "role_id")
    private Long roleId;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
