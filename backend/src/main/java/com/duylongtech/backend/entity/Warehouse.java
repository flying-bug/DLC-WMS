package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "WAREHOUSES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Warehouse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String type = "STANDARD";

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "APPROVED";

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

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
