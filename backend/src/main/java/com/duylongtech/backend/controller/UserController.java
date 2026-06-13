package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.UserDto;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.UserDetailResponseDTO;
import com.duylongtech.backend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "API quản lý tài khoản người dùng")
public class UserController {

    private final UserService userService;

    // 2. View Account Detail (Xem thông tin cá nhân)
    @GetMapping("/me")
    @Operation(summary = "Xem thông tin cá nhân", description = "Lấy thông tin profile của user đang đăng nhập. Yêu cầu Bearer Token.")
    public ApiResponse<UserDetailResponseDTO> getCurrentUserProfile() {
        return ApiResponse.success(userService.getCurrentUserProfile());
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
    public ApiResponse<UserDto> createUser(@RequestBody UserDto userDto) {
        return ApiResponse.success(userService.createUser(userDto));
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
    public ApiResponse<?> updateStatus(@PathVariable Long id, @RequestParam String status) {
        userService.updateStatus(id, status);
        return ApiResponse.success();
    }

    // 9. Update Functional Permissions
    @PutMapping("/{id}/permissions")
    @PreAuthorize("hasAuthority('auth:edit')")
    public ApiResponse<?> updatePermissions(@PathVariable Long id, @RequestBody List<String> permissionCodes) {
        userService.updatePermissions(id, permissionCodes);
        return ApiResponse.success();
    }

    // 10. Update Information
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('account:edit')")
    public ApiResponse<UserDto> updateUser(@PathVariable Long id, @RequestBody UserDto userDto) {
        return ApiResponse.success(userService.updateUser(id, userDto));
    }
}

