package com.duylongtech.backend.feature.notification;

import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.notification.AppNotification;
import com.duylongtech.backend.feature.notification.AppNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import com.duylongtech.backend.feature.notification.AppNotification;
import com.duylongtech.backend.feature.notification.AppNotificationRepository;
import com.duylongtech.backend.feature.notification.AppNotificationService;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppNotificationService {

    private final AppNotificationRepository notificationRepository;
    private final RealtimeSessionService realtimeSessionService;

    @Transactional(readOnly = true)
    public List<AppNotification> getNotifications(Long userId, List<String> roles) {
        boolean isAdmin = roles != null && roles.stream().anyMatch(r -> r != null && (r.equalsIgnoreCase("ROLE_SUPER_ADMIN") || r.equalsIgnoreCase("SUPER_ADMIN")));
        if (roles == null || roles.isEmpty()) {
            roles = Collections.emptyList();
        }
        return notificationRepository.findForUserAndRoles(userId, roles, isAdmin);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId, List<String> roles) {
        boolean isAdmin = roles != null && roles.stream().anyMatch(r -> r != null && (r.equalsIgnoreCase("ROLE_SUPER_ADMIN") || r.equalsIgnoreCase("SUPER_ADMIN")));
        if (roles == null || roles.isEmpty()) {
            roles = Collections.emptyList();
        }
        return notificationRepository.countUnreadForUserAndRoles(userId, roles, isAdmin);
    }

    @Transactional
    public void markAsRead(Long id, Long userId, List<String> roles) {
        boolean isAdmin = roles != null && roles.stream().anyMatch(r -> r != null && (r.equalsIgnoreCase("ROLE_SUPER_ADMIN") || r.equalsIgnoreCase("SUPER_ADMIN")));
        List<String> safeRoles = (roles == null || roles.isEmpty()) ? Collections.emptyList() : roles;
        int updated = notificationRepository.markAsRead(id, userId, safeRoles, isAdmin);
        if (updated == 0) {
            throw new BusinessException("Không tìm thấy thông báo hoặc bạn không có quyền truy cập thông báo này");
        }
    }

    @Transactional
    public void markAllAsRead(Long userId, List<String> roles) {
        boolean isAdmin = roles != null && roles.stream().anyMatch(r -> r != null && (r.equalsIgnoreCase("ROLE_SUPER_ADMIN") || r.equalsIgnoreCase("SUPER_ADMIN")));
        if (roles == null || roles.isEmpty()) {
            roles = Collections.emptyList();
        }
        notificationRepository.markAllAsRead(userId, roles, isAdmin);
    }

    @Transactional
    public AppNotification createNotification(String recipientRole, Long userId, String title, String message,
                                              String type, String referenceType, Long referenceId, String link) {
        AppNotification notif = new AppNotification();
        notif.initNotification(recipientRole, userId, title, message, type, referenceType, referenceId, link);
        AppNotification saved = notificationRepository.save(notif);
        realtimeSessionService.publishNotification(saved);
        return saved;
    }
}
