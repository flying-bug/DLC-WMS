package com.duylongtech.backend.service;

import com.duylongtech.backend.entity.RoleEntity;

import java.util.List;

public interface RoleService {
    List<RoleEntity> getAllRoles(String module);

    RoleEntity getRoleById(Long id);

    RoleEntity updateRolePermissions(Long id, List<String> permissionCodes);

    RoleEntity resetRolePermissions(Long id);
}
