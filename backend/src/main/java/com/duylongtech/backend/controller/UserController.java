package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.UserDto;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.UserDetailResponseDTO;
import com.duylongtech.backend.service.UserService;
import com.duylongtech.backend.service.AuditLogService;
import com.duylongtech.backend.service.RealtimeSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "API quản lý tài khoản người dùng")
public class UserController {

    private final UserService userService;
    private final AuditLogService auditLogService;
    private final RealtimeSessionService realtimeSessionService;

    private String getClientIp(jakarta.servlet.http.HttpServletRequest request) {
        String ipAddress = request.getHeader("X-Forwarded-For");
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getRemoteAddr();
        }
        if (ipAddress != null && ipAddress.contains(",")) {
            ipAddress = ipAddress.split(",")[0].trim();
        }
        return ipAddress;
    }

    private String getCurrentUser() {
        return org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
    }

    // 2. View Account Detail (Xem thông tin cá nhân)
    @GetMapping("/me")
    @Operation(summary = "Xem thông tin cá nhân", description = "Lấy thông tin profile của user đang đăng nhập. Yêu cầu Bearer Token.")
    public ApiResponse<UserDetailResponseDTO> getCurrentUserProfile() {
        return ApiResponse.success(userService.getCurrentUserProfile());
    }

    @PutMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Cap nhat anh dai dien", description = "Tai anh len Cloudinary va luu URL vao profile user dang dang nhap.")
    public ApiResponse<UserDetailResponseDTO> updateCurrentUserAvatar(@RequestParam("file") MultipartFile file) {
        return ApiResponse.success(userService.updateCurrentUserAvatar(file));
    }

    // 5. View Account List
    @GetMapping
    @PreAuthorize("hasAuthority('account:view')")
    public ApiResponse<List<UserDto>> getUsers() {
        return ApiResponse.success(userService.getAllUsers());
    }

    // 6. Create Account
    @PostMapping
    @PreAuthorize("hasAuthority('account:add')")
    public ApiResponse<UserDto> createUser(@jakarta.validation.Valid @RequestBody UserDto userDto, jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            UserDto created = userService.createUser(userDto);
            String detailJson = auditLogService.buildChangeDetail(null, created, "Tạo mới tài khoản");
            auditLogService.logEvent(
                actor,
                "CREATE",
                "Account",
                created.getId(),
                "SUCCESS",
                "Tạo mới tài khoản " + created.getUsername(),
                ip,
                detailJson
            );
            realtimeSessionService.publishUserUpdated(created, "USER_CREATED");
            return ApiResponse.success(created);
        } catch (Exception e) {
            auditLogService.logEvent(
                actor,
                "CREATE",
                "Account",
                null,
                "FAILED",
                "Tạo mới tài khoản " + userDto.getUsername() + " thất bại: " + e.getMessage(),
                ip,
                null
            );
            throw e;
        }
    }

    // 7. View Account Details
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('account:view')")
    public ApiResponse<UserDto> getUserDetails(@PathVariable Long id) {
        return ApiResponse.success(userService.getUserById(id));
    }

    // 8. Lock/Unlock Account
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('account:edit')")
    public ApiResponse<?> updateStatus(@PathVariable Long id, @RequestParam String status, jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        String targetUsername = "ID " + id;
        UserDto before = null;
        try {
            before = userService.getUserById(id);
            if (before != null) {
                targetUsername = before.getUsername();
            }
        } catch (Exception ignored) {}

        try {
            userService.updateStatus(id, status);
            UserDto after = userService.getUserById(id);
            String detailJson = auditLogService.buildChangeDetail(before, after, "Cập nhật trạng thái tài khoản");
            auditLogService.logEvent(
                actor,
                "UPDATE",
                "Account",
                id,
                "SUCCESS",
                "Cập nhật trạng thái tài khoản " + targetUsername + " thành " + status,
                ip,
                detailJson
            );
            realtimeSessionService.publishUserUpdated(after, "USER_STATUS_CHANGED");
            if ("INACTIVE".equalsIgnoreCase(after.getStatus())) {
                realtimeSessionService.forceLogoutUser(after.getId(), "ACCOUNT_LOCKED", "Tai khoan cua ban da bi khoa boi quan tri vien.");
            }
            return ApiResponse.success();
        } catch (Exception e) {
            auditLogService.logEvent(
                actor,
                "UPDATE",
                "Account",
                id,
                "FAILED",
                "Cập nhật trạng thái tài khoản " + targetUsername + " thất bại: " + e.getMessage(),
                ip,
                null
            );
            throw e;
        }
    }

    // 9. Update Functional Permissions
    @PutMapping("/{id}/permissions")
    @PreAuthorize("hasAuthority('auth:edit')")
    public ApiResponse<?> updatePermissions(@PathVariable Long id, @RequestBody List<String> permissionCodes, jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        String targetUsername = "ID " + id;
        UserDto before = null;
        try {
            before = userService.getUserById(id);
            if (before != null) {
                targetUsername = before.getUsername();
            }
        } catch (Exception ignored) {}

        try {
            userService.updatePermissions(id, permissionCodes);
            UserDto after = userService.getUserById(id);
            String detailJson = auditLogService.buildChangeDetail(before, after, "Phân quyền tài khoản");
            auditLogService.logEvent(
                actor,
                "UPDATE",
                "Permission",
                id,
                "SUCCESS",
                "Phân quyền tài khoản " + targetUsername,
                ip,
                detailJson
            );
            realtimeSessionService.publishUserUpdated(after, "USER_PERMISSIONS_CHANGED");
            realtimeSessionService.forceLogoutUser(after.getId(), "PERMISSIONS_CHANGED", "Quyen truy cap cua ban vua duoc cap nhat. Vui long dang nhap lai.");
            return ApiResponse.success();
        } catch (Exception e) {
            auditLogService.logEvent(
                actor,
                "UPDATE",
                "Permission",
                id,
                "FAILED",
                "Phân quyền tài khoản " + targetUsername + " thất bại: " + e.getMessage(),
                ip,
                null
            );
            throw e;
        }
    }

    // 10. Update Information
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('account:edit')")
    public ApiResponse<UserDto> updateUser(@PathVariable Long id, @RequestBody UserDto userDto, jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String actor = getCurrentUser();
        try {
            UserDto before = userService.getUserById(id);
            UserDto updated = userService.updateUser(id, userDto);
            String detailJson = auditLogService.buildChangeDetail(before, updated, "Cập nhật thông tin tài khoản");
            auditLogService.logEvent(
                actor,
                "UPDATE",
                "Account",
                id,
                "SUCCESS",
                "Cập nhật thông tin tài khoản " + updated.getUsername(),
                ip,
                detailJson
            );
            realtimeSessionService.publishUserUpdated(updated, "USER_UPDATED");
            boolean statusChangedToInactive = !"INACTIVE".equalsIgnoreCase(before.getStatus())
                    && "INACTIVE".equalsIgnoreCase(updated.getStatus());
            boolean rolesChanged = !java.util.Objects.equals(
                    before.getRoles() == null ? java.util.Set.of() : new java.util.HashSet<>(before.getRoles()),
                    updated.getRoles() == null ? java.util.Set.of() : new java.util.HashSet<>(updated.getRoles())
            );
            if (statusChangedToInactive) {
                realtimeSessionService.forceLogoutUser(updated.getId(), "ACCOUNT_LOCKED", "Tai khoan cua ban da bi khoa boi quan tri vien.");
            } else if (rolesChanged) {
                realtimeSessionService.forceLogoutUser(updated.getId(), "ROLES_CHANGED", "Vai tro cua ban vua duoc cap nhat. Vui long dang nhap lai.");
            }
            return ApiResponse.success(updated);
        } catch (Exception e) {
            auditLogService.logEvent(
                actor,
                "UPDATE",
                "Account",
                id,
                "FAILED",
                "Cập nhật thông tin tài khoản ID " + id + " thất bại: " + e.getMessage(),
                ip,
                null
            );
            throw e;
        }
    }
}

