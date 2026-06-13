package com.duylongtech.backend.security;

import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.entity.RoleEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class UserDetailsImpl implements UserDetails {
    private Long id;
    private String username;
    private String password;
    private boolean enabled;
    private Collection<? extends GrantedAuthority> authorities;

    public UserDetailsImpl(Long id, String username, String password, boolean enabled, Collection<? extends GrantedAuthority> authorities) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.enabled = enabled;
        this.authorities = authorities;
    }

    public static UserDetailsImpl build(User user) {
        List<GrantedAuthority> authorities = new java.util.ArrayList<>();
        boolean isStaff = false;
        boolean hasAdminOrManager = false;

        if (user.getRoles() != null) {
            for (RoleEntity role : user.getRoles()) {
                String code = role.getCode();
                if ("STAFF".equalsIgnoreCase(code)) {
                    isStaff = true;
                }
                if ("SUPER_ADMIN".equalsIgnoreCase(code) || "MANAGER".equalsIgnoreCase(code)) {
                    hasAdminOrManager = true;
                }
                String authority = code.startsWith("ROLE_") ? code : "ROLE_" + code;
                authorities.add(new SimpleGrantedAuthority(authority));

                // Add role-based permissions for SUPER_ADMIN or MANAGER
                if (("SUPER_ADMIN".equalsIgnoreCase(code) || "MANAGER".equalsIgnoreCase(code)) && role.getPermissions() != null) {
                    role.getPermissions().forEach(permission -> {
                        authorities.add(new SimpleGrantedAuthority(permission.getCode()));
                    });
                }
            }
        }

        // If user is STAFF and does not have admin/manager roles, load dynamic permissions
        if (isStaff && !hasAdminOrManager) {
            if (user.getPermissions() != null && !user.getPermissions().isEmpty()) {
                user.getPermissions().forEach(permission -> {
                    authorities.add(new SimpleGrantedAuthority(permission.getCode()));
                });
            } else {
                // Fallback to default STAFF permissions from DB if no custom permissions are set
                if (user.getRoles() != null) {
                    user.getRoles().forEach(role -> {
                        if ("STAFF".equalsIgnoreCase(role.getCode()) && role.getPermissions() != null) {
                            role.getPermissions().forEach(permission -> {
                                authorities.add(new SimpleGrantedAuthority(permission.getCode()));
                            });
                        }
                    });
                }
            }
        }
        boolean enabled = "APPROVED".equalsIgnoreCase(user.getStatus());
        return new UserDetailsImpl(
                user.getId(),
                user.getUsername(),
                user.getPasswordHash(),
                enabled,
                authorities);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    public Long getId() {
        return id;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() { return true; }
    @Override
    public boolean isAccountNonLocked() { return true; }
    @Override
    public boolean isCredentialsNonExpired() { return true; }
    @Override
    public boolean isEnabled() { return enabled; }
}
