package com.duylongtech.backend.feature.warehouse;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "USER_WAREHOUSE_ROLES", uniqueConstraints = {
    @UniqueConstraint(name = "uk_user_warehouse_role", columnNames = {"user_id", "warehouse_id", "role_id"})
})
@Getter
@NoArgsConstructor
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
        private Boolean isActive = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void initRole(Long userId, Long warehouseId, Long roleId) {
        this.userId = userId;
        this.warehouseId = warehouseId;
        this.roleId = roleId;
        this.isActive = true;
    }

    public void updateStatus(Boolean isActive) {
        if (isActive != null) {
            this.isActive = isActive;
        }
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
