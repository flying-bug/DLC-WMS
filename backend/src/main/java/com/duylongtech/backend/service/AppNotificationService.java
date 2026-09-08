package com.duylongtech.backend.service;

import com.duylongtech.backend.entity.AppNotification;
import com.duylongtech.backend.repository.AppNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppNotificationService {

    private final AppNotificationRepository notificationRepository;

    @Transactional(readOnly = true)
    public List<AppNotification> getNotifications(Long userId, List<String> roles) {
        boolean isAdmin = roles != null && roles.stream().anyMatch(r -> r != null && (r.equalsIgnoreCase("ROLE_ADMIN") || r.equalsIgnoreCase("ADMIN")));
        if (roles == null || roles.isEmpty()) {
            roles = Collections.singletonList("ROLE_STAFF");
        }
        return notificationRepository.findForUserAndRoles(userId, roles, isAdmin);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId, List<String> roles) {
        boolean isAdmin = roles != null && roles.stream().anyMatch(r -> r != null && (r.equalsIgnoreCase("ROLE_ADMIN") || r.equalsIgnoreCase("ADMIN")));
        if (roles == null || roles.isEmpty()) {
            roles = Collections.singletonList("ROLE_STAFF");
        }
        return notificationRepository.countUnreadForUserAndRoles(userId, roles, isAdmin);
    }

    @Transactional
    public void markAsRead(Long id) {
        notificationRepository.markAsRead(id);
    }

    @Transactional
    public void markAllAsRead(Long userId, List<String> roles) {
        boolean isAdmin = roles != null && roles.stream().anyMatch(r -> r != null && (r.equalsIgnoreCase("ROLE_ADMIN") || r.equalsIgnoreCase("ADMIN")));
        if (roles == null || roles.isEmpty()) {
            roles = Collections.singletonList("ROLE_STAFF");
        }
        notificationRepository.markAllAsRead(userId, roles, isAdmin);
    }

    @Transactional
    public AppNotification createNotification(String recipientRole, Long userId, String title, String message,
                                              String type, String referenceType, Long referenceId, String link) {
        AppNotification notif = AppNotification.builder()
                .recipientRole(recipientRole)
                .userId(userId)
                .title(title)
                .message(message)
                .type(type)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .link(link)
                .isRead(false)
                .build();
        return notificationRepository.save(notif);
    }
}
