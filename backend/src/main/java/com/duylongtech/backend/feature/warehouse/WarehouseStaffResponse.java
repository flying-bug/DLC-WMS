package com.duylongtech.backend.feature.warehouse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WarehouseStaffResponse {
    private Long userId;
    private String fullName;
    private String email;
    private List<RoleDto> roles;
    private Boolean isActive;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoleDto {
        private Long id;
        private String code;
        private String name;
    }
}
