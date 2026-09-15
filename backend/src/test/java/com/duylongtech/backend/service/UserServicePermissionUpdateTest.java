package com.duylongtech.backend.service;

import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.auth.PermissionRepository;
import com.duylongtech.backend.feature.auth.RoleEntity;
import com.duylongtech.backend.feature.auth.RoleRepository;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.auth.UserDto;
import com.duylongtech.backend.feature.auth.UserMapper;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.auth.UserService;
import com.duylongtech.backend.feature.system.CloudinaryService;
import com.duylongtech.backend.feature.system.EmailService;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserServicePermissionUpdateTest {
    @Test
    void updateUserActuallyAssignsResolvedRoles() {
        UserRepository userRepository = mock(UserRepository.class);
        RoleRepository roleRepository = mock(RoleRepository.class);
        UserMapper userMapper = mock(UserMapper.class);
        User user = user();
        RoleEntity accountant = new RoleEntity();
        accountant.initRole("ROLE_ACCOUNTANT", "Kế toán", null, "APPROVED");
        UserDto request = new UserDto();
        request.setRoles(List.of("ROLE_ACCOUNTANT"));

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(roleRepository.findByCode("ROLE_ACCOUNTANT")).thenReturn(Optional.of(accountant));
        when(userRepository.save(user)).thenReturn(user);
        when(userMapper.toDto(user)).thenReturn(new UserDto());

        service(userRepository, roleRepository, mock(PermissionRepository.class), userMapper).updateUser(1L, request);

        assertSame(accountant, user.getRoles().iterator().next());
    }

    @Test
    void updatePermissionsRejectsUnknownCodesInsteadOfReportingSuccess() {
        UserRepository userRepository = mock(UserRepository.class);
        PermissionRepository permissionRepository = mock(PermissionRepository.class);
        User user = user();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(permissionRepository.findByCode("missing:view")).thenReturn(Optional.empty());

        UserService service = service(userRepository, mock(RoleRepository.class), permissionRepository, mock(UserMapper.class));

        assertThrows(BusinessException.class, () -> service.updatePermissions(1L, List.of("missing:view")));
        verify(userRepository, never()).save(user);
    }

    private static UserService service(UserRepository userRepository, RoleRepository roleRepository,
            PermissionRepository permissionRepository, UserMapper userMapper) {
        return new UserService(userRepository, roleRepository, mock(PasswordEncoder.class), permissionRepository,
                mock(CloudinaryService.class), mock(EmailService.class), userMapper);
    }

    private static User user() {
        User user = new User();
        user.initUser("staff", null, "hash", "Staff", "APPROVED");
        return user;
    }
}
