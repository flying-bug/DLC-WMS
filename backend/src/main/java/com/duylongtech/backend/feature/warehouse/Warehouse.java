package com.duylongtech.backend.feature.warehouse;

import com.duylongtech.backend.enums.DocumentStatus;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import com.duylongtech.backend.feature.auth.User;

@Entity
@Table(name = "WAREHOUSES")
@Getter
@NoArgsConstructor
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
        private String type = "STANDARD";

    @Column(nullable = false, length = 20)
        private String status = DocumentStatus.APPROVED.name();

    @Version
    @Column(nullable = false)
        private Long version = 0L;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id")
    private User creator;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updater_id")
    private User updater;

    public void initWarehouse(String code, String name, String address, String type) {
        this.code = code;
        this.name = name;
        this.address = address;
        if (type != null) {
            this.type = type;
        }
    }

    public void updateDetails(String code, String name, String address, String type) {
        if (code != null) this.code = code;
        if (name != null) this.name = name;
        if (address != null) this.address = address;
        if (type != null) this.type = type;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void assignCreator(User creator) {
        if (this.creator == null) {
            this.creator = creator;
        }
    }

    public void assignUpdater(User updater) {
        this.updater = updater;
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
