package com.duylongtech.backend.feature.auth;

import com.duylongtech.backend.enums.DocumentStatus;

import com.duylongtech.backend.feature.auth.UserDto;
import com.duylongtech.backend.feature.system.UploadResponse;
import com.duylongtech.backend.feature.auth.UserDetailResponseDTO;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.security.UserDetailsImpl;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.constant.AppConstants;
import com.duylongtech.backend.constant.SystemMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.security.SecureRandom;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.HashSet;
import java.util.Set;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.duylongtech.backend.feature.auth.RoleEntity;
import com.duylongtech.backend.feature.auth.PermissionEntity;
import com.duylongtech.backend.feature.auth.RoleRepository;
import com.duylongtech.backend.feature.auth.PermissionRepository;
import com.duylongtech.backend.feature.auth.UserMapper;
import com.duylongtech.backend.feature.auth.PermissionEntity;
import com.duylongtech.backend.feature.auth.PermissionRepository;
import com.duylongtech.backend.feature.auth.RoleEntity;
import com.duylongtech.backend.feature.auth.RoleRepository;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.auth.UserDetailResponseDTO;
import com.duylongtech.backend.feature.auth.UserDto;
import com.duylongtech.backend.feature.auth.UserMapper;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.auth.UserService;
import com.duylongtech.backend.feature.system.CloudinaryService;
import com.duylongtech.backend.feature.system.EmailService;
import com.duylongtech.backend.feature.system.UploadResponse;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final PermissionRepository permissionRepository;
    private final CloudinaryService cloudinaryService;
    private final EmailService emailService;
    private final UserMapper userMapper;
    private final com.duylongtech.backend.feature.warehouse.UserWarehouseRoleRepository userWarehouseRoleRepository;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

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
        String avatarUrl = uploaded.getSecureUrl() != null ? uploaded.getSecureUrl() : uploaded.getUrl();
        user.updateProfile(user.getFullName(), avatarUrl, user.getEmail(), user.getPhone(), user.getAddress(), user.getIdCard(), user.getDob(), user.getGender());
        User saved = userRepository.save(user);
        return mapToDetailDto(saved);
    }

    public UserDetailResponseDTO updateCurrentUserProfile(UserDto userDto) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        User user = userRepository.findWithRolesById(userDetails.getId())
                .orElseThrow(() -> new BusinessException(SystemMessage.USER_NOT_FOUND));

        String fullName = normalizeFullName(userDto.getFullName());

        String phone = normalizePhone(userDto.getPhone());
        if (phone == null || phone.isEmpty()) {
            throw new BusinessException(SystemMessage.FIELD_REQUIRED);
        }
        if (!phone.matches(AppConstants.MOBILE_REGEX)) {
            throw new BusinessException(SystemMessage.INVALID_PHONE);
        }
        if (!phone.equals(user.getPhone()) && userRepository.existsByPhoneAndIdNot(phone, user.getId())) {
            throw new BusinessException(SystemMessage.PHONE_EXISTS);
        }

        user.updateProfile(fullName, user.getAvatarUrl(), user.getEmail(), phone, user.getAddress(), user.getIdCard(), user.getDob(), user.getGender());
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
        boolean isActive = DocumentStatus.APPROVED.name().equalsIgnoreCase(user.getStatus());

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
        return userRepository.findAll().stream().map(userMapper::toDto).collect(Collectors.toList());
    }

    /**
     * Tìm kiếm nhân sự theo keyword (fullName, username, email, phone).
     * Dùng cho AssignStaffModal — không yêu cầu quyền SUPER_ADMIN.
     * Chỉ trả về tài khoản đang APPROVED để tránh gán quyền cho tài khoản bị khóa.
     */
    public List<UserDto> searchUsers(String keyword) {
        String kw = (keyword == null || keyword.isBlank()) ? "" : keyword.trim().toLowerCase();
        return userRepository.findAll().stream()
                .filter(u -> DocumentStatus.APPROVED.name().equalsIgnoreCase(u.getStatus()))
                .filter(u -> {
                    if (kw.isEmpty()) return true;
                    return (u.getFullName() != null && u.getFullName().toLowerCase().contains(kw))
                            || (u.getUsername() != null && u.getUsername().toLowerCase().contains(kw))
                            || (u.getEmail() != null && u.getEmail().toLowerCase().contains(kw))
                            || (u.getPhone() != null && u.getPhone().contains(kw));
                })
                .limit(10)
                .map(userMapper::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserDto createUser(UserDto userDto) {
        String username = userDto.getUsername().trim();
        String fullName = normalizeFullName(userDto.getFullName());
        String email = userDto.getEmail().trim();
        String phone = normalizePhone(userDto.getPhone());
        String temporaryPassword = generateTemporaryPassword();

        if (userRepository.existsByUsername(username)) {
            throw new BusinessException(SystemMessage.USERNAME_EXISTS);
        }
        if (userRepository.existsByEmail(email)) {
            throw new BusinessException(SystemMessage.EMAIL_EXISTS);
        }
        if (phone != null && !phone.isEmpty() && userRepository.existsByPhone(phone)) {
            throw new BusinessException(SystemMessage.PHONE_EXISTS);
        }

        User user = userMapper.toEntity(userDto);
        user.initUser(username, null, passwordEncoder.encode(temporaryPassword), fullName, DocumentStatus.APPROVED.name());
        user.updateProfile(fullName, null, email, phone, null, null, null, null);
        String idCard = userDto.getIdCard() != null ? userDto.getIdCard().trim() : null;
        if (idCard != null && idCard.length() > 20) {
            idCard = idCard.substring(0, 20);
        }
        user.updateProfile(user.getFullName(), user.getAvatarUrl(), user.getEmail(), user.getPhone(), user.getAddress(), idCard, user.getDob(), user.getGender());

        if (userDto.getRoles() == null || userDto.getRoles().isEmpty()) {
            throw new BusinessException(SystemMessage.ROLE_REQUIRED);
        }
        Set<RoleEntity> roles = new HashSet<>();
        userDto.getRoles().forEach(roleCode -> {
            findRoleByCode(roleCode).ifPresent(roles::add);
        });
        if (roles.isEmpty()) {
            throw new BusinessException(SystemMessage.ROLE_REQUIRED);
        }
        user.updateRoles(roles);

        User savedUser = userRepository.save(user);

        // Nếu tài khoản có role Thủ kho/Kỹ thuật và admin đã chọn sẵn kho phụ trách,
        // gán luôn quan hệ user-kho-vai trò để user thao tác được ngay, không phải chờ
        // Manager vào từng kho gán thủ công ở tab "Nhân sự".
        List<Long> warehouseScopedRoleIds = roles.stream()
                .filter(r -> r.getCode() != null
                        && (r.getCode().toUpperCase().contains("WAREHOUSE_CONTROLLER")
                                || r.getCode().toUpperCase().contains("TECHNICIAN")))
                .map(RoleEntity::getId)
                .toList();
        if (!warehouseScopedRoleIds.isEmpty() && userDto.getWarehouseIds() != null) {
            for (Long warehouseId : userDto.getWarehouseIds()) {
                if (warehouseId == null) continue;
                for (Long roleId : warehouseScopedRoleIds) {
                    com.duylongtech.backend.feature.warehouse.UserWarehouseRole mapping =
                            new com.duylongtech.backend.feature.warehouse.UserWarehouseRole();
                    mapping.initRole(savedUser.getId(), warehouseId, roleId);
                    userWarehouseRoleRepository.save(mapping);
                }
            }
        }

        try {
            emailService.sendNewEmployeeCredentialsEmail(email, fullName, username, temporaryPassword);
        } catch (Exception e) {
            System.err.println("Không thể gửi email tài khoản nhân viên (" + email + "): " + e.getMessage());
        }
        return userMapper.toDto(savedUser);
    }

    public UserDto getUserById(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new BusinessException(SystemMessage.USER_NOT_FOUND));
        return userMapper.toDto(user);
    }

    public void updateStatus(Long id, String status) {
        User user = userRepository.findById(id).orElseThrow(() -> new BusinessException(SystemMessage.USER_NOT_FOUND));
        String normalizedStatus = status == null ? "" : status.trim().toUpperCase();
        if (!Set.of(DocumentStatus.APPROVED.name(), com.duylongtech.backend.enums.EntityStatus.INACTIVE.name()).contains(normalizedStatus)) {
            throw new BusinessException(SystemMessage.INVALID_USER_STATUS);
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (com.duylongtech.backend.enums.EntityStatus.INACTIVE.name().equals(normalizedStatus) && authentication != null
                && authentication.getPrincipal() instanceof UserDetailsImpl currentUser
                && currentUser.getId().equals(id)) {
            throw new BusinessException(SystemMessage.CANNOT_LOCK_SELF);
        }

        user.changeStatus(normalizedStatus);
        userRepository.save(user);
    }

    @Transactional
    public UserDto updatePermissions(Long id, List<String> permissionCodes) {
        User user = userRepository.findById(id).orElseThrow(() -> new BusinessException(SystemMessage.USER_NOT_FOUND));
        boolean isSuperAdmin = user.getRoles() != null && user.getRoles().stream()
                .anyMatch(role -> "ROLE_SUPER_ADMIN".equalsIgnoreCase(role.getCode()) || "SUPER_ADMIN".equalsIgnoreCase(role.getCode()));
        if (isSuperAdmin) {
            throw new BusinessException(SystemMessage.ACCESS_DENIED);
        }
        Set<PermissionEntity> permissions = new HashSet<>();
        if (permissionCodes != null) {
            permissionCodes.forEach(code -> {
                if (code != null && !code.isBlank()) {
                    String normalizedCode = code.trim();
                    PermissionEntity permission = permissionRepository.findByCode(normalizedCode)
                            .orElseThrow(() -> new BusinessException("Quyền không tồn tại: " + normalizedCode));
                    permissions.add(permission);
                }
            });
        }
        user.updatePermissions(permissions);
        return userMapper.toDto(userRepository.save(user));
    }

    @Transactional
    public UserDto updateUser(Long id, UserDto userDto) {
        User user = userRepository.findById(id).orElseThrow(() -> new BusinessException(SystemMessage.USER_NOT_FOUND));
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
            user.updateProfile(user.getFullName(), user.getAvatarUrl(), email, user.getPhone(), user.getAddress(), user.getIdCard(), user.getDob(), user.getGender());
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
            user.updateProfile(user.getFullName(), user.getAvatarUrl(), user.getEmail(), phone, user.getAddress(), user.getIdCard(), user.getDob(), user.getGender());
        }

        if (userDto.getStatus() != null) {
            String normalizedStatus = userDto.getStatus().trim().toUpperCase();
            if (!Set.of(DocumentStatus.APPROVED.name(), com.duylongtech.backend.enums.EntityStatus.INACTIVE.name()).contains(normalizedStatus)) {
                throw new BusinessException(SystemMessage.INVALID_USER_STATUS);
            }
            user.changeStatus(normalizedStatus);
        }

        if (userDto.getRoles() != null) {
            Set<RoleEntity> roles = new HashSet<>();
            userDto.getRoles().forEach(roleCode -> {
                findRoleByCode(roleCode).ifPresent(roles::add);
            });
            if (roles.isEmpty()) {
                throw new BusinessException(SystemMessage.ROLE_REQUIRED);
            }
            user.updateRoles(roles);
        }
        userMapper.updateEntity(user, userDto);

        if (userDto.getFullName() != null) {
            user.updateProfile(normalizeFullName(userDto.getFullName()), user.getAvatarUrl(), user.getEmail(), user.getPhone(), user.getAddress(), user.getIdCard(), user.getDob(), user.getGender());
        }
        
        if (userDto.getIdCard() != null) {
            String idCard = userDto.getIdCard().trim();
            if (idCard.length() > 20) idCard = idCard.substring(0, 20);
            user.updateProfile(user.getFullName(), user.getAvatarUrl(), user.getEmail(), user.getPhone(), user.getAddress(), idCard, user.getDob(), user.getGender());
        }
        User updated = userRepository.save(user);
        return userMapper.toDto(updated);
    }

    private boolean isValidEmail(String email) {
        return email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    }

    private String normalizePhone(String phone) {
        return phone == null ? null : phone.trim().replaceAll("[\\s.-]", "");
    }

    private String normalizeFullName(String fullName) {
        String normalized = fullName == null ? "" : fullName.trim().replaceAll("\\s+", " ");
        if (normalized.isEmpty()) {
            throw new BusinessException(SystemMessage.FIELD_REQUIRED);
        }
        if (!normalized.matches(AppConstants.FULL_NAME_REGEX)) {
            throw new BusinessException(SystemMessage.INVALID_FULL_NAME);
        }
        return normalized;
    }

    private String generateTemporaryPassword() {
        StringBuilder password = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            password.append(PASSWORD_CHARS.charAt(SECURE_RANDOM.nextInt(PASSWORD_CHARS.length())));
        }
        return password.toString();
    }
}
