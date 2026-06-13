package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.UserDto;
import com.duylongtech.backend.dto.response.UserDetailResponseDTO;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.repository.UserRepository;
import com.duylongtech.backend.security.UserDetailsImpl;
import com.duylongtech.backend.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;
import java.util.HashSet;
import java.util.Set;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.duylongtech.backend.entity.RoleEntity;
import com.duylongtech.backend.entity.PermissionEntity;
import com.duylongtech.backend.repository.RoleRepository;
import com.duylongtech.backend.repository.PermissionRepository;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final PermissionRepository permissionRepository;

    // ======================== View Account Detail (GET /api/v1/users/me) ========================

    /**
     * Lấy thông tin profile của user hiện tại đang đăng nhập.
     * - Trích xuất userId từ SecurityContext (JWT Token).
     * - Query database kèm JOIN Roles (tránh N+1).
     * - Map sang DTO: che giấu password_hash, chuyển status -> isActive.
     */
    public UserDetailResponseDTO getCurrentUserProfile() {
        // 1. Lấy thông tin user đang đăng nhập từ SecurityContext
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        // 2. Query user kèm roles (EntityGraph JOIN FETCH)
        User user = userRepository.findWithRolesById(userDetails.getId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy tài khoản trong hệ thống."));

        // 3. Map Entity -> DTO (Data Masking: không trả về password_hash)
        return mapToDetailDto(user);
    }

    /**
     * Map User entity sang UserDetailResponseDTO.
     * Business Rules:
     * - Data Masking: Tuyệt đối không trả về password_hash.
     * - Status Mapping: APPROVED -> isActive = true, các trạng thái khác -> false.
     * - Data Aggregation: Gom nhóm roles từ bảng USER_ROLES + ROLES.
     */
    private UserDetailResponseDTO mapToDetailDto(User user) {
        // Map danh sách roles
        List<UserDetailResponseDTO.RoleDTO> roleDtos = user.getRoles().stream()
                .map(role -> UserDetailResponseDTO.RoleDTO.builder()
                        .code(role.getCode())
                        .name(role.getName())
                        .build())
                .collect(Collectors.toList());

        // Chuyển đổi status -> isActive (APPROVED = true, còn lại = false)
        boolean isActive = "APPROVED".equalsIgnoreCase(user.getStatus());

        return UserDetailResponseDTO.builder()
                .id(user.getId())
                .userCode(user.getUserCode())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .address(user.getAddress())
                .avatarUrl(user.getAvatarUrl())
                .isActive(isActive)
                .roles(roleDtos)
                .createdAt(user.getCreatedAt())
                .build();
    }

    // ======================== Existing methods ========================

    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream().map(this::mapToDto).collect(Collectors.toList());
    }

    public UserDto createUser(UserDto userDto) {
        User user = new User();
        user.setUsername(userDto.getUsername());
        user.setFullName(userDto.getFullName());
        user.setEmail(userDto.getEmail());
        user.setPhone(userDto.getPhone());
        user.setStatus("APPROVED");
        user.setPasswordHash(passwordEncoder.encode("123456")); // Default password

        Set<RoleEntity> roles = new HashSet<>();
        if (userDto.getRoles() != null && !userDto.getRoles().isEmpty()) {
            userDto.getRoles().forEach(roleCode -> {
                roleRepository.findByCode(roleCode).ifPresent(roles::add);
            });
        } else {
            roleRepository.findByCode("STAFF").ifPresent(roles::add);
        }
        user.setRoles(roles);

        User savedUser = userRepository.save(user);
        return mapToDto(savedUser);
    }

    public UserDto getUserById(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new BusinessException("User not found"));
        return mapToDto(user);
    }

    public void updateStatus(Long id, String status) {
        User user = userRepository.findById(id).orElseThrow(() -> new BusinessException("User not found"));
        user.setStatus(status);
        userRepository.save(user);
    }

    public void updatePermissions(Long id, List<String> permissionCodes) {
        User user = userRepository.findById(id).orElseThrow(() -> new BusinessException("User not found"));
        Set<PermissionEntity> permissions = new HashSet<>();
        if (permissionCodes != null) {
            permissionCodes.forEach(code -> {
                permissionRepository.findByCode(code).ifPresent(permissions::add);
            });
        }
        user.setPermissions(permissions);
        userRepository.save(user);
    }

    public UserDto updateUser(Long id, UserDto userDto) {
        User user = userRepository.findById(id).orElseThrow(() -> new BusinessException("User not found"));
        user.setFullName(userDto.getFullName());
        user.setEmail(userDto.getEmail());
        user.setPhone(userDto.getPhone());
        if (userDto.getRoles() != null) {
            Set<RoleEntity> roles = new HashSet<>();
            userDto.getRoles().forEach(roleCode -> {
                roleRepository.findByCode(roleCode).ifPresent(roles::add);
            });
            user.setRoles(roles);
        }
        User updated = userRepository.save(user);
        return mapToDto(updated);
    }

    private UserDto mapToDto(User user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setFullName(user.getFullName());
        dto.setEmail(user.getEmail());
        dto.setPhone(user.getPhone());
        dto.setStatus(user.getStatus());
        if (user.getRoles() != null) {
            dto.setRoles(user.getRoles().stream().map(RoleEntity::getCode).collect(Collectors.toList()));
        }
        if (user.getPermissions() != null) {
            dto.setPermissions(user.getPermissions().stream().map(PermissionEntity::getCode).collect(Collectors.toList()));
        }
        return dto;
    }
}

