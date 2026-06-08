package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.UserDto;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // 5. View Account List
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER')")
    public ApiResponse<List<UserDto>> getUsers() {
        return ApiResponse.success(userService.getAllUsers());
    }

    // 6. Create Account
    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<UserDto> createUser(@RequestBody UserDto userDto) {
        return ApiResponse.success(userService.createUser(userDto));
    }

    // 7. View Account Details
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER')")
    public ApiResponse<UserDto> getUserDetails(@PathVariable Long id) {
        return ApiResponse.success(userService.getUserById(id));
    }

    // 8. Lock/Unlock Account
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<?> updateStatus(@PathVariable Long id, @RequestParam String status) {
        userService.updateStatus(id, status);
        return ApiResponse.success();
    }

    // 9. Update Functional Permissions
    @PutMapping("/{id}/permissions")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<?> updatePermissions(@PathVariable Long id, @RequestBody List<Long> roleIds) {
        userService.updatePermissions(id, roleIds);
        return ApiResponse.success();
    }

    // 10. Update Information
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER')")
    public ApiResponse<UserDto> updateUser(@PathVariable Long id, @RequestBody UserDto userDto) {
        return ApiResponse.success(userService.updateUser(id, userDto));
    }
}
