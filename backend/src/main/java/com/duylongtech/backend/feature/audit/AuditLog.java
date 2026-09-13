package com.duylongtech.backend.feature.audit;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;
import com.duylongtech.backend.feature.auth.User;

@Entity
@Table(name = "AUDIT_LOGS")
@Getter
@NoArgsConstructor
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 50)
    private String action;

    @Column(name = "entity_name", nullable = false, length = 100)
    private String entityName;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(columnDefinition = "JSON")
    private String detail;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(length = 20)
    private String status; // SUCCESS, FAILED

    @Column(columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public void initLog(User user, String action, String entityName, Long entityId, String detail, String ipAddress, String status, String description) {
        this.user = user;
        this.action = action;
        this.entityName = entityName;
        this.entityId = entityId;
        this.detail = detail;
        this.ipAddress = ipAddress;
        this.status = status;
        this.description = description;
    }
}
