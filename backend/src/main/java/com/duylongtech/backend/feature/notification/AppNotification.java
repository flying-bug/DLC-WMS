package com.duylongtech.backend.feature.notification;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "APP_NOTIFICATIONS")
@Getter
@NoArgsConstructor
public class AppNotification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipient_role", length = 50)
    private String recipientRole;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "message", columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "type", length = 50)
    private String type; // DISCREPANCY, SYSTEM, ORDER, STOCK

    @Column(name = "reference_type", length = 50)
    private String referenceType;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "link", length = 255)
    private String link;

    @Column(name = "warehouse_id")
    private Long warehouseId;

    @Column(name = "is_read")
    private Boolean isRead = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public void initNotification(String recipientRole, Long userId, String title, String message, String type, String referenceType, Long referenceId, String link, Long warehouseId) {
        this.recipientRole = recipientRole;
        this.userId = userId;
        this.title = title;
        this.message = message;
        this.type = type;
        this.referenceType = referenceType;
        this.referenceId = referenceId;
        this.link = link;
        this.warehouseId = warehouseId;
        this.isRead = false;
    }

    public void markAsRead() {
        this.isRead = true;
    }
}
