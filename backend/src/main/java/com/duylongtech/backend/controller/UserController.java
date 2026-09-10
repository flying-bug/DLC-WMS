package com.duylongtech.backend.controller;

import com.duylongtech.backend.annotation.Auditable;
import com.duylongtech.backend.enums.AuditAction;
import com.duylongtech.backend.dto.request.UserDto;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.UserDetailResponseDTO;
import com.duylongtech.backend.service.UserService;
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
    private final RealtimeSessionService realtimeSessionService;

    // 2. View Account Detail (Xem thông tin cá nhân)
    @GetMapping("/me")
    @Operation(summary = "Xem thông tin cá nhân", description = "Lấy thông tin profile của user đang đăng nhập. Yêu cầu Bearer Token.")
    public ApiResponse<UserDetailResponseDTO> getCurrentUserProfile() {
        return ApiResponse.success(userService.getCurrentUserProfile());
    }

    @PutMapping("/me")
    @Operation(summary = "Cập nhật thông tin cá nhân", description = "Chỉ cho phép user hiện tại cập nhật họ tên và số điện thoại.")
    public ApiResponse<UserDetailResponseDTO> updateCurrentUserProfile(@RequestBody UserDto userDto) {
        return ApiResponse.success(userService.updateCurrentUserProfile(userDto));
    }

    @PutMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Cap nhat anh dai dien", description = "Tai anh len Cloudinary va luu URL vao profile user dang dang nhap.")
    public ApiResponse<UserDetailResponseDTO> updateCurrentUserAvatar(@RequestParam("file") MultipartFile file) {
        return ApiResponse.success(userService.updateCurrentUserAvatar(file));
    }

    // 5. View Account List (SUPER_ADMIN only)
    @GetMapping
    @PreAuthorize("hasAuthority('account:view')")
    public ApiResponse<List<UserDto>> getUsers() {
        return ApiResponse.success(userService.getAllUsers());
    }

    // 5b. Search Users for warehouse staff assignment (accessible to Manager)
    @GetMapping("/search")
    public ApiResponse<List<UserDto>> searchUsers(@RequestParam(required = false) String keyword) {
        return ApiResponse.success(userService.searchUsers(keyword));
    }

    // 6. Create Account
    @PostMapping
    @PreAuthorize("hasAuthority('account:add')")
    @Auditable(action = AuditAction.CREATE, entityName = "Account", actionDescription = "Tạo mới tài khoản")
    public ApiResponse<UserDto> createUser(@jakarta.validation.Valid @RequestBody UserDto userDto) {
        UserDto created = userService.createUser(userDto);
        realtimeSessionService.publishUserUpdated(created, "USER_CREATED");
        return ApiResponse.success(created);
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
    @Auditable(action = AuditAction.UPDATE, entityName = "Account", actionDescription = "Cập nhật trạng thái tài khoản")
    public ApiResponse<?> updateStatus(@PathVariable Long id, @RequestParam String status) {
        userService.updateStatus(id, status);
        UserDto after = userService.getUserById(id);
        realtimeSessionService.publishUserUpdated(after, "USER_STATUS_CHANGED");
        if ("INACTIVE".equalsIgnoreCase(after.getStatus())) {
            realtimeSessionService.forceLogoutUser(after.getId(), "ACCOUNT_LOCKED", "Tai khoan cua ban da bi khoa boi quan tri vien.");
        }
        return ApiResponse.success();
    }

    // 9. Update Functional Permissions
    @PutMapping("/{id}/permissions")
    @PreAuthorize("hasAuthority('auth:edit')")
    @Auditable(action = AuditAction.UPDATE, entityName = "Permission", actionDescription = "Phân quyền tài khoản")
    public ApiResponse<?> updatePermissions(@PathVariable Long id, @RequestBody List<String> permissionCodes) {
        userService.updatePermissions(id, permissionCodes);
        UserDto after = userService.getUserById(id);
        realtimeSessionService.publishUserUpdated(after, "USER_PERMISSIONS_CHANGED");
        realtimeSessionService.forceLogoutUser(after.getId(), "PERMISSIONS_CHANGED", "Quyền truy cập của bạn vừa được cập nhật. Vui lòng đăng nhập lại");
        return ApiResponse.success();
    }

    // 10. Update Information
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('account:edit')")
    @Auditable(action = AuditAction.UPDATE, entityName = "Account", actionDescription = "Cập nhật thông tin tài khoản")
    public ApiResponse<UserDto> updateUser(@PathVariable Long id, @RequestBody UserDto userDto) {
        UserDto before = userService.getUserById(id);
        UserDto updated = userService.updateUser(id, userDto);
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
    }
}

