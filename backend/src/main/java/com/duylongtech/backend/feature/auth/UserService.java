package com.duylongtech.backend.feature.auth;

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

public interface UserService {
    UserDetailResponseDTO getCurrentUserProfile();
    UserDetailResponseDTO updateCurrentUserAvatar(MultipartFile file);
    UserDetailResponseDTO updateCurrentUserProfile(UserDto userDto);
    List<UserDto> getAllUsers();
    List<UserDto> searchUsers(String keyword);
    UserDto createUser(UserDto userDto);
    UserDto getUserById(Long id);
    void updateStatus(Long id, String status);
    void updatePermissions(Long id, List<String> permissionCodes);
    UserDto updateUser(Long id, UserDto userDto);
}
