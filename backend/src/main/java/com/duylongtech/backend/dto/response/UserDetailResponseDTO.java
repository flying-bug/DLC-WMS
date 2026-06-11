package com.duylongtech.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDetailResponseDTO {
    private Long id;
    private String userCode;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private String address;
    private String avatarUrl;
    private boolean isActive;
    private List<RoleDTO> roles;
    private LocalDateTime createdAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoleDTO {
        private String code;
        private String name;
    }
}
