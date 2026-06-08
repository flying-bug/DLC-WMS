package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.UserDto;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // 5. View Account List
    @GetMapping
    public ApiResponse<List<UserDto>> getUsers() {
        return ApiResponse.success(userService.getAllUsers());
    }

    // 6. Create Account
    @PostMapping
    public ApiResponse<UserDto> createUser(@RequestBody UserDto userDto) {
        return ApiResponse.success(userService.createUser(userDto));
    }

    // 7. View Account Details
    @GetMapping("/{id}")
    public ApiResponse<UserDto> getUserDetails(@PathVariable Long id) {
        return ApiResponse.success(userService.getUserById(id));
    }

    // 8. Lock/Unlock Account
    @PutMapping("/{id}/status")
    public ApiResponse<?> updateStatus(@PathVariable Long id, @RequestParam String status) {
        userService.updateStatus(id, status);
        return ApiResponse.success();
    }

    // 9. Update Functional Permissions
    @PutMapping("/{id}/permissions")
    public ApiResponse<?> updatePermissions(@PathVariable Long id, @RequestBody List<Long> roleIds) {
        userService.updatePermissions(id, roleIds);
        return ApiResponse.success();
    }

    // 10. Update Information
    @PutMapping("/{id}")
    public ApiResponse<UserDto> updateUser(@PathVariable Long id, @RequestBody UserDto userDto) {
        return ApiResponse.success(userService.updateUser(id, userDto));
    }
}
