package com.duylongtech.backend.feature.product;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import com.duylongtech.backend.enums.EntityStatus;

import java.time.LocalDateTime;

@Entity
@Table(name = "UNITS")
@Getter
@NoArgsConstructor
public class Unit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "status", length = 30)
    private String status;

    @Column(name = "created_by")
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void initUnit(String name, String description, Long creatorId) {
        this.name = name;
        this.description = description;
        this.status = com.duylongtech.backend.enums.EntityStatus.ACTIVE.name();
        this.createdBy = creatorId;
    }

    public void updateDetails(String name, String description) {
        if (name != null) this.name = name;
        if (description != null) this.description = description;
    }

    public void changeStatus(EntityStatus status) {
        this.status = status.name();
    }
}
