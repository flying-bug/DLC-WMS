package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.entity.RoleEntity;
import com.duylongtech.backend.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleRepository roleRepository;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('auth:view', 'warehouse:edit')")
    public ApiResponse<List<RoleEntity>> getRoles(@org.springframework.web.bind.annotation.RequestParam(required = false) String module) {
        List<RoleEntity> roles = roleRepository.findAll();
        if ("WAREHOUSE".equalsIgnoreCase(module)) {
            roles = roles.stream()
                    .filter(r -> !"SUPER_ADMIN".equals(r.getCode()) && !"HR_MANAGER".equals(r.getCode()))
                    .collect(java.util.stream.Collectors.toList());
        }
        return ApiResponse.success(roles);
    }
}
