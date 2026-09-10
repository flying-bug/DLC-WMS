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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.security.SecureRandom;
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
