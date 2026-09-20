package com.duylongtech.backend.feature.notification;

import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.notification.AppNotification;
import com.duylongtech.backend.feature.notification.AppNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import com.duylongtech.backend.feature.notification.AppNotification;
import com.duylongtech.backend.feature.notification.AppNotificationRepository;
import com.duylongtech.backend.feature.notification.AppNotificationService;
import com.duylongtech.backend.feature.warehouse.UserWarehouseRoleRepository;
import com.duylongtech.backend.feature.warehouse.UserWarehouseRole;


@Service
@RequiredArgsConstructor
@Slf4j
public class AppNotificationService {

    // Notification lists have no natural upper bound (they only ever grow), and
    // admins see every recipient's notifications - cap to the most recent ones
    // instead of returning the entire table on every poll.
    private static final int MAX_NOTIFICATIONS_RETURNED = 100;

    private final AppNotificationRepository notificationRepository;
    private final RealtimeSessionService realtimeSessionService;
    private final UserWarehouseRoleRepository userWarehouseRoleRepository;

    private List<Long> getWarehouseIds(Long userId) {
        List<Long> ids = userWarehouseRoleRepository.findByUserId(userId).stream()
                .map(UserWarehouseRole::getWarehouseId)
                .toList();
        return ids.isEmpty() ? List.of(-1L) : ids;
    }

    @Transactional(readOnly = true)
    public List<AppNotification> getNotifications(Long userId, List<String> roles) {
        boolean isAdmin = roles != null && roles.stream().anyMatch(r -> r != null && (r.equalsIgnoreCase("ROLE_SUPER_ADMIN") || r.equalsIgnoreCase("SUPER_ADMIN")));
        if (roles == null || roles.isEmpty()) {
            roles = Collections.emptyList();
        }
        return notificationRepository.findForUserAndRoles(userId, roles, isAdmin, getWarehouseIds(userId), PageRequest.of(0, MAX_NOTIFICATIONS_RETURNED));
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId, List<String> roles) {
        boolean isAdmin = roles != null && roles.stream().anyMatch(r -> r != null && (r.equalsIgnoreCase("ROLE_SUPER_ADMIN") || r.equalsIgnoreCase("SUPER_ADMIN")));
        if (roles == null || roles.isEmpty()) {
            roles = Collections.emptyList();
        }
        return notificationRepository.countUnreadForUserAndRoles(userId, roles, isAdmin, getWarehouseIds(userId));
    }

    @Transactional
    public void markAsRead(Long id, Long userId, List<String> roles) {
        boolean isAdmin = roles != null && roles.stream().anyMatch(r -> r != null && (r.equalsIgnoreCase("ROLE_SUPER_ADMIN") || r.equalsIgnoreCase("SUPER_ADMIN")));
        List<String> safeRoles = (roles == null || roles.isEmpty()) ? Collections.emptyList() : roles;
        int updated = notificationRepository.markAsRead(id, userId, safeRoles, isAdmin, getWarehouseIds(userId));
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
        notificationRepository.markAllAsRead(userId, roles, isAdmin, getWarehouseIds(userId));
    }

    @Transactional
    public void retypeNotifications(String referenceType, Long referenceId, String oldType, String newType) {
        notificationRepository.retypeByReference(referenceType, referenceId, oldType, newType);
    }

    @Transactional
    public AppNotification createNotification(String recipientRole, Long userId, String title, String message,
                                              String type, String referenceType, Long referenceId, String link, Long warehouseId) {
        AppNotification notif = new AppNotification();
        notif.initNotification(recipientRole, userId, title, message, type, referenceType, referenceId, link, warehouseId);
        AppNotification saved = notificationRepository.save(notif);
        realtimeSessionService.publishNotification(saved);
        return saved;
    }
}
