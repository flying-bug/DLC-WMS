package com.duylongtech.backend.feature.auth;

import com.duylongtech.backend.feature.auth.RoleEntity;

import java.util.List;

public interface RoleService {
    List<RoleEntity> getAllRoles(String module);

    RoleEntity getRoleById(Long id);

    RoleEntity updateRolePermissions(Long id, List<String> permissionCodes);

    RoleEntity resetRolePermissions(Long id);
}
