package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.entity.AppNotification;
import com.duylongtech.backend.security.UserDetailsImpl;
import com.duylongtech.backend.service.AppNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class AppNotificationController {

    private final AppNotificationService notificationService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AppNotification>>> getMyNotifications(
            @AuthenticationPrincipal UserDetailsImpl currentUser) {
        Long userId = currentUser != null ? currentUser.getId() : null;
        List<String> roles = currentUser != null
                ? currentUser.getAuthorities().stream().map(GrantedAuthority::getAuthority).collect(Collectors.toList())
                : List.of("ROLE_STAFF");
        List<AppNotification> list = notificationService.getNotifications(userId, roles);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(
            @AuthenticationPrincipal UserDetailsImpl currentUser) {
        Long userId = currentUser != null ? currentUser.getId() : null;
        List<String> roles = currentUser != null
                ? currentUser.getAuthorities().stream().map(GrantedAuthority::getAuthority).collect(Collectors.toList())
                : List.of("ROLE_STAFF");
        long count = notificationService.getUnreadCount(userId, roles);
        return ResponseEntity.ok(ApiResponse.success(Map.of("unreadCount", count)));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(
            @AuthenticationPrincipal UserDetailsImpl currentUser) {
        Long userId = currentUser != null ? currentUser.getId() : null;
        List<String> roles = currentUser != null
                ? currentUser.getAuthorities().stream().map(GrantedAuthority::getAuthority).collect(Collectors.toList())
                : List.of("ROLE_STAFF");
        notificationService.markAllAsRead(userId, roles);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
