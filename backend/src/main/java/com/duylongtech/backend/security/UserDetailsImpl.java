package com.duylongtech.backend.security;

import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.entity.RoleEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public class UserDetailsImpl implements UserDetails {
    private Long id;
    private String username;
    private String password;
    private boolean enabled;
    private Collection<? extends GrantedAuthority> authorities;

    public UserDetailsImpl(Long id, String username, String password, boolean enabled,
            Collection<? extends GrantedAuthority> authorities) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.enabled = enabled;
        this.authorities = authorities;
    }

    public static UserDetailsImpl build(User user) {
        Set<String> authorityStrings = new java.util.HashSet<>();

        boolean hasCustomPermissions = user.getPermissions() != null && !user.getPermissions().isEmpty();

        if (user.getRoles() != null) {
            for (RoleEntity role : user.getRoles()) {
                String code = role.getCode();
                if (code != null && !code.isBlank()) {
                    String authority = code.startsWith("ROLE_") ? code : "ROLE_" + code;
                    authorityStrings.add(authority);

                    // If user has no custom permissions override, load role default permissions
                    if (!hasCustomPermissions && role.getPermissions() != null) {
                        role.getPermissions().forEach(permission -> {
                            if (permission.getCode() != null) {
                                authorityStrings.add(permission.getCode());
                            }
                        });
                    }
                }
            }
        }

        // If user has custom permissions saved, load them directly
        if (hasCustomPermissions) {
            user.getPermissions().forEach(permission -> {
                if (permission.getCode() != null) {
                    authorityStrings.add(permission.getCode());
                }
            });
        }

        List<GrantedAuthority> authorities = authorityStrings.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(java.util.stream.Collectors.toList());

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
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
