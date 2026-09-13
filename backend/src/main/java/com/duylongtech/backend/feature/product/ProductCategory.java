package com.duylongtech.backend.feature.product;

import com.duylongtech.backend.enums.DocumentStatus;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "PRODUCT_CATEGORIES")
@Getter
@NoArgsConstructor
public class ProductCategory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "parent_id")
    private Long parentId;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "status", length = 30)
    private String status;

    @Column(columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void initCategory(String name, String description, Long creatorId) {
        this.name = name;
        this.description = description;
        this.status = DocumentStatus.APPROVED.name();
    }

    public void updateDetails(String name, String description) {
        if (name != null) this.name = name;
        if (description != null) this.description = description;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public void setParentId(Long parentId) {
        this.parentId = parentId;
    }
}
