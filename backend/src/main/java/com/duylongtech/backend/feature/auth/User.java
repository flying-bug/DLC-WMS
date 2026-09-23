package com.duylongtech.backend.feature.auth;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "USERS")
@Getter
@NoArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(name = "user_code", unique = true, length = 50)
    private String userCode;

    // Entity User bị trả thẳng ra JSON ở vài chỗ (vd. AuditLog.user) nên không bao giờ được lộ hash mật khẩu.
    @JsonIgnore
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(unique = true, length = 100)
    private String email;

    @Column(unique = true, length = 20)
    private String phone;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "id_card", length = 20)
    private String idCard;

    private java.time.LocalDate dob;

    @Column(length = 10)
    private String gender;

    @Column(name = "start_date")
    private java.time.LocalDate startDate;

    @Column(length = 50)
    private String position;

    @Column(length = 50)
    private String department;

    @Column(nullable = false, length = 20)
    private String status; // DRAFT, APPROVED, CANCELLED, INACTIVE

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "USER_ROLES",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<RoleEntity> roles = new HashSet<>();

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "USER_PERMISSIONS",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    private Set<PermissionEntity> permissions = new HashSet<>();

    public void initUser(String username, String userCode, String passwordHash, String fullName, String status) {
        this.username = username;
        this.userCode = userCode;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.status = status;
    }

    public void updateProfile(String fullName, String avatarUrl, String email, String phone, String address, String idCard, java.time.LocalDate dob, String gender) {
        this.fullName = fullName;
        this.avatarUrl = avatarUrl;
        this.email = email;
        this.phone = phone;
        this.address = address;
        this.idCard = idCard;
        this.dob = dob;
        this.gender = gender;
    }

    public void updateWorkInfo(String position, String department, java.time.LocalDate startDate) {
        this.position = position;
        this.department = department;
        this.startDate = startDate;
    }

    public void changePassword(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public void changeStatus(String status) {
        this.status = status;
    }


    public void updateRoles(Set<RoleEntity> roles) {
        this.roles = roles;
    }

    public void updatePermissions(Set<PermissionEntity> permissions) {
        this.permissions = permissions;
    }
}
