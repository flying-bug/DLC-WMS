package com.duylongtech.backend.service;

import com.duylongtech.backend.entity.AppNotification;
import com.duylongtech.backend.repository.AppNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Collections;
import java.util.List;

public interface AppNotificationService {
    List<AppNotification> getNotifications(Long userId, List<String> roles);
    long getUnreadCount(Long userId, List<String> roles);
    void markAsRead(Long id);
    void markAllAsRead(Long userId, List<String> roles);
    AppNotification createNotification(String recipientRole, Long userId, String title, String message,
                                              String type, String referenceType, Long referenceId, String link);
}
