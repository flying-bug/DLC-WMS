package com.duylongtech.backend.feature.auth;

import com.duylongtech.backend.feature.auth.UserDto;
import com.duylongtech.backend.feature.auth.PermissionEntity;
import com.duylongtech.backend.feature.auth.RoleEntity;
import com.duylongtech.backend.feature.auth.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import org.mapstruct.ReportingPolicy;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.MappingTarget;

import java.util.List;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface UserMapper {

    @Mapping(target = "roles", expression = "java(mapRoles(user.getRoles()))")
    @Mapping(target = "permissions", expression = "java(mapPermissions(user.getPermissions()))")
    UserDto toDto(User user);

    @Mapping(target = "roles", ignore = true)
    @Mapping(target = "permissions", ignore = true)
    User toEntity(UserDto dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "roles", ignore = true)
    @Mapping(target = "permissions", ignore = true)
    void updateEntity(@MappingTarget User entity, UserDto dto);

    default List<String> mapRoles(java.util.Set<RoleEntity> roles) {
        if (roles == null) {
            return null;
        }
        return roles.stream().map(RoleEntity::getCode).collect(Collectors.toList());
    }

    default List<String> mapPermissions(java.util.Set<PermissionEntity> permissions) {
        if (permissions == null) {
            return null;
        }
        return permissions.stream().map(PermissionEntity::getCode).collect(Collectors.toList());
    }
}
