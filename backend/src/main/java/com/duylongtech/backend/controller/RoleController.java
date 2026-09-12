package com.duylongtech.backend.controller;

import com.duylongtech.backend.annotation.Auditable;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.entity.RoleEntity;
import com.duylongtech.backend.enums.AuditAction;
import com.duylongtech.backend.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('auth:view', 'warehouse_master:edit')")
    public ApiResponse<List<RoleEntity>> getRoles(@RequestParam(required = false) String module) {
        List<RoleEntity> roles = roleService.getAllRoles(module);
        return ApiResponse.success(roles);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('auth:view')")
    public ApiResponse<RoleEntity> getRoleById(@PathVariable Long id) {
        RoleEntity role = roleService.getRoleById(id);
        return ApiResponse.success(role);
    }

    @PutMapping("/{id}/permissions")
    @PreAuthorize("hasAuthority('auth:edit')")
    @Auditable(action = AuditAction.UPDATE, entityName = "RolePermission", actionDescription = "Cập nhật phân quyền vai trò")
    public ApiResponse<RoleEntity> updateRolePermissions(@PathVariable Long id, @RequestBody List<String> permissionCodes) {
        RoleEntity updated = roleService.updateRolePermissions(id, permissionCodes);
        return ApiResponse.success(updated);
    }

    @PostMapping("/{id}/permissions/reset")
    @PreAuthorize("hasAuthority('auth:edit')")
    @Auditable(action = AuditAction.UPDATE, entityName = "RolePermission", actionDescription = "Khôi phục phân quyền mặc định cho vai trò")
    public ApiResponse<RoleEntity> resetRolePermissions(@PathVariable Long id) {
        RoleEntity resetRole = roleService.resetRolePermissions(id);
        return ApiResponse.success(resetRole);
    }
}
