package com.duylongtech.backend.security;

import com.duylongtech.backend.entity.User;
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
        List<GrantedAuthority> authorities = user.getRoles().stream()
                .map(role -> {
                    String code = role.getCode();
                    String authority = code.startsWith("ROLE_") ? code : "ROLE_" + code;
                    return new SimpleGrantedAuthority(authority);
                })
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
    public boolean isAccountNonExpired() { return true; }
    @Override
    public boolean isAccountNonLocked() { return true; }
    @Override
    public boolean isCredentialsNonExpired() { return true; }
    @Override
    public boolean isEnabled() { return enabled; }
}
