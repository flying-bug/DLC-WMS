package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.UserDto;
import com.duylongtech.backend.dto.response.UploadResponse;
import com.duylongtech.backend.dto.response.UserDetailResponseDTO;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.repository.UserRepository;
import com.duylongtech.backend.security.UserDetailsImpl;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.constant.AppConstants;
import com.duylongtech.backend.constant.SystemMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;
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
    private final CloudinaryService cloudinaryService;

    private Optional<RoleEntity> findRoleByCode(String roleCode) {
        if (roleCode == null || roleCode.isBlank()) {
            return Optional.empty();
        }
        String normalizedCode = roleCode.startsWith("ROLE_") ? roleCode : "ROLE_" + roleCode;
        return roleRepository.findByCode(roleCode)
                .or(() -> roleRepository.findByCode(normalizedCode));
    }

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
                .orElseThrow(() -> new BusinessException(SystemMessage.USER_NOT_FOUND));

        // 3. Map Entity -> DTO (Data Masking: không trả về password_hash)
        return mapToDetailDto(user);
    }

    public UserDetailResponseDTO updateCurrentUserAvatar(MultipartFile file) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        User user = userRepository.findWithRolesById(userDetails.getId())
                .orElseThrow(() -> new BusinessException(SystemMessage.USER_NOT_FOUND));
        UploadResponse uploaded = cloudinaryService.uploadImage(file, "avatars");
        user.setAvatarUrl(uploaded.getSecureUrl() != null ? uploaded.getSecureUrl() : uploaded.getUrl());
        User saved = userRepository.save(user);
        return mapToDetailDto(saved);
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
                .idCard(user.getIdCard())
                .dob(user.getDob())
                .gender(user.getGender())
                .startDate(user.getStartDate())
                .position(user.getPosition())
                .department(user.getDepartment())
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
        String username = userDto.getUsername().trim();
        String email = userDto.getEmail().trim();
        String phone = normalizePhone(userDto.getPhone());

        if (userRepository.existsByUsername(username)) {
            throw new BusinessException(SystemMessage.USERNAME_EXISTS);
        }
        if (userRepository.existsByEmail(email)) {
            throw new BusinessException(SystemMessage.EMAIL_EXISTS);
        }
        if (phone != null && !phone.isEmpty() && userRepository.existsByPhone(phone)) {
            throw new BusinessException(SystemMessage.PHONE_EXISTS);
        }

        User user = new User();
        user.setUsername(username);
        user.setFullName(userDto.getFullName().trim());
        user.setEmail(email);
        user.setPhone(phone);
        user.setStatus("APPROVED");
        user.setPasswordHash(passwordEncoder.encode("123456")); // Default password
        user.setIdCard(userDto.getIdCard());
        user.setDob(userDto.getDob());
        user.setGender(userDto.getGender());
        user.setStartDate(userDto.getStartDate());
        user.setPosition(userDto.getPosition());
        user.setDepartment(userDto.getDepartment());
        user.setAddress(userDto.getAddress());

        Set<RoleEntity> roles = new HashSet<>();
        if (userDto.getRoles() != null && !userDto.getRoles().isEmpty()) {
            userDto.getRoles().forEach(roleCode -> {
                findRoleByCode(roleCode).ifPresent(roles::add);
            });
        } else {
            findRoleByCode("STAFF").ifPresent(roles::add);
        }
        user.setRoles(roles);

        User savedUser = userRepository.save(user);
        return mapToDto(savedUser);
    }

    public UserDto getUserById(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new BusinessException(SystemMessage.USER_NOT_FOUND));
        return mapToDto(user);
    }

    public void updateStatus(Long id, String status) {
        User user = userRepository.findById(id).orElseThrow(() -> new BusinessException(SystemMessage.USER_NOT_FOUND));
        String normalizedStatus = status == null ? "" : status.trim().toUpperCase();
        if (!Set.of("APPROVED", "INACTIVE").contains(normalizedStatus)) {
            throw new BusinessException(SystemMessage.INVALID_USER_STATUS);
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if ("INACTIVE".equals(normalizedStatus) && authentication != null
                && authentication.getPrincipal() instanceof UserDetailsImpl currentUser
                && currentUser.getId().equals(id)) {
            throw new BusinessException(SystemMessage.CANNOT_LOCK_SELF);
        }

        user.setStatus(normalizedStatus);
        userRepository.save(user);
    }

    public void updatePermissions(Long id, List<String> permissionCodes) {
        User user = userRepository.findById(id).orElseThrow(() -> new BusinessException(SystemMessage.USER_NOT_FOUND));
        boolean isStaff = user.getRoles() != null && user.getRoles().stream()
                .anyMatch(role -> "STAFF".equalsIgnoreCase(role.getCode()));
        if (!isStaff) {
            throw new BusinessException(SystemMessage.STAFF_ONLY_PERMISSION);
        }
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
        User user = userRepository.findById(id).orElseThrow(() -> new BusinessException(SystemMessage.USER_NOT_FOUND));
        if (userDto.getFullName() != null) {
            String fullName = userDto.getFullName().trim();
            if (fullName.isEmpty()) {
                throw new BusinessException(SystemMessage.FIELD_REQUIRED);
            }
            user.setFullName(fullName);
        }

        if (userDto.getEmail() != null) {
            String email = userDto.getEmail().trim();
            if (email.isEmpty()) {
                throw new BusinessException(SystemMessage.FIELD_REQUIRED);
            }
            if (!isValidEmail(email)) {
                throw new BusinessException(SystemMessage.INVALID_EMAIL);
            }
            if (!email.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmailAndIdNot(email, id)) {
                throw new BusinessException(SystemMessage.EMAIL_EXISTS);
            }
            user.setEmail(email);
        }

        if (userDto.getPhone() != null) {
            String phone = normalizePhone(userDto.getPhone());
            if (phone.isEmpty()) {
                throw new BusinessException(SystemMessage.FIELD_REQUIRED);
            }
            if (!phone.matches(AppConstants.MOBILE_REGEX)) {
                throw new BusinessException(SystemMessage.INVALID_PHONE);
            }
            if (!phone.equals(user.getPhone()) && userRepository.existsByPhoneAndIdNot(phone, id)) {
                throw new BusinessException(SystemMessage.PHONE_EXISTS);
            }
            user.setPhone(phone);
        }

        if (userDto.getStatus() != null) {
            String normalizedStatus = userDto.getStatus().trim().toUpperCase();
            if (!Set.of("APPROVED", "INACTIVE").contains(normalizedStatus)) {
                throw new BusinessException(SystemMessage.INVALID_USER_STATUS);
            }
            user.setStatus(normalizedStatus);
        }

        if (userDto.getRoles() != null) {
            Set<RoleEntity> roles = new HashSet<>();
            userDto.getRoles().forEach(roleCode -> {
                findRoleByCode(roleCode).ifPresent(roles::add);
            });
            user.setRoles(roles);
        }
        if (userDto.getIdCard() != null) user.setIdCard(userDto.getIdCard());
        if (userDto.getDob() != null) user.setDob(userDto.getDob());
        if (userDto.getGender() != null) user.setGender(userDto.getGender());
        if (userDto.getStartDate() != null) user.setStartDate(userDto.getStartDate());
        if (userDto.getPosition() != null) user.setPosition(userDto.getPosition());
        if (userDto.getDepartment() != null) user.setDepartment(userDto.getDepartment());
        if (userDto.getAddress() != null) user.setAddress(userDto.getAddress());
        User updated = userRepository.save(user);
        return mapToDto(updated);
    }

    private boolean isValidEmail(String email) {
        return email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    }

    private String normalizePhone(String phone) {
        return phone == null ? null : phone.trim().replaceAll("[\\s.-]", "");
    }

    private UserDto mapToDto(User user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setFullName(user.getFullName());
        dto.setEmail(user.getEmail());
        dto.setPhone(user.getPhone());
        dto.setStatus(user.getStatus());
        dto.setIdCard(user.getIdCard());
        dto.setDob(user.getDob());
        dto.setGender(user.getGender());
        dto.setStartDate(user.getStartDate());
        dto.setPosition(user.getPosition());
        dto.setDepartment(user.getDepartment());
        dto.setAddress(user.getAddress());
        if (user.getRoles() != null) {
            dto.setRoles(user.getRoles().stream().map(RoleEntity::getCode).collect(Collectors.toList()));
        }
        if (user.getPermissions() != null) {
            dto.setPermissions(user.getPermissions().stream().map(PermissionEntity::getCode).collect(Collectors.toList()));
        }
        return dto;
    }
}
