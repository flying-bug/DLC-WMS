package com.duylongtech.backend.feature.notification;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.feature.auth.UserDto;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.notification.RealtimeForceLogoutEvent;
import com.duylongtech.backend.feature.notification.RealtimeUserEvent;
import com.duylongtech.backend.feature.system.SystemHealthDto;
import com.duylongtech.backend.feature.system.SystemHealthService;
import com.duylongtech.backend.security.UserDetailsImpl;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.auth.UserDto;
import com.duylongtech.backend.feature.notification.RealtimeForceLogoutEvent;
import com.duylongtech.backend.feature.notification.RealtimeSessionService;
import com.duylongtech.backend.feature.notification.RealtimeUserEvent;
import com.duylongtech.backend.feature.warehouse.UserWarehouseRoleRepository;
import com.duylongtech.backend.feature.warehouse.UserWarehouseRole;


@Slf4j
@Service
@RequiredArgsConstructor
public class RealtimeSessionService {

    private static final long SSE_TIMEOUT_MILLIS = 0L;
    private static final String EVENT_CONNECTED = "connected";
    private static final String EVENT_PING = "ping";
    private static final String EVENT_USER_UPDATED = "user-updated";
    private static final String EVENT_FORCE_LOGOUT = "force-logout";
    private static final String EVENT_NOTIFICATION = "notification";
    private static final String EVENT_SYSTEM_HEALTH = "system-health";
    private static final String EVENT_DATA_CHANGED = "data-changed";
    private static final String TOPIC_USER = "USER";

    private final SystemHealthService systemHealthService;
    private final UserWarehouseRoleRepository userWarehouseRoleRepository;
    private final UserRepository userRepository;

    private final ConcurrentMap<String, ClientConnection> connections = new ConcurrentHashMap<>();
    // Ping chạy trên luồng riêng: tác vụ chậm (system-health truy vấn DB, kiểm tra phiên) không làm trễ ping,
    // nếu không proxy (nginx...) sẽ cắt kết nối "im lặng" và client phải kết nối lại liên tục.
    private final ScheduledExecutorService heartbeatExecutor = Executors.newSingleThreadScheduledExecutor(
            daemonThreadFactory("realtime-heartbeat"));
    private final ScheduledExecutorService maintenanceExecutor = Executors.newSingleThreadScheduledExecutor(
            daemonThreadFactory("realtime-maintenance"));

    @PostConstruct
    void startHeartbeat() {
        heartbeatExecutor.scheduleWithFixedDelay(safely("heartbeat", this::sendHeartbeat), 20, 20, TimeUnit.SECONDS);
        maintenanceExecutor.scheduleWithFixedDelay(safely("system-health", this::broadcastSystemHealth), 10, 10, TimeUnit.SECONDS);
        maintenanceExecutor.scheduleWithFixedDelay(safely("session-check", this::closeRevokedSessions), 30, 30, TimeUnit.SECONDS);
    }

    @PreDestroy
    void shutdown() {
        heartbeatExecutor.shutdownNow();
        maintenanceExecutor.shutdownNow();
        List.copyOf(connections.keySet()).forEach(this::removeConnection);
    }

    /**
     * Một lỗi thoát ra khỏi tác vụ định kỳ làm ScheduledExecutorService âm thầm hủy mọi lần chạy sau: heartbeat
     * dừng hẳn, kết nối đã hỏng không còn được phát hiện và dồn lại trong bộ nhớ. Bắt mọi lỗi để tác vụ luôn chạy tiếp.
     */
    private Runnable safely(String taskName, Runnable task) {
        return () -> {
            try {
                task.run();
            } catch (Throwable ex) {
                log.warn("Realtime task '{}' failed, will retry on next run: {}", taskName, ex.toString(), ex);
            }
        };
    }

    private static java.util.concurrent.ThreadFactory daemonThreadFactory(String name) {
        return runnable -> {
            Thread thread = new Thread(runnable, name);
            thread.setDaemon(true);
            return thread;
        };
    }

    @Transactional(readOnly = true)
    public SseEmitter subscribe(UserDetailsImpl userDetails) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MILLIS);
        String connectionId = UUID.randomUUID().toString();
        Set<Long> warehouseIds = userWarehouseRoleRepository.findByUserId(userDetails.getId()).stream()
                .map(UserWarehouseRole::getWarehouseId)
                .collect(Collectors.toSet());

        ClientConnection connection = new ClientConnection(
                connectionId,
                userDetails.getId(),
                userDetails.getSessionId(),
                userDetails.getAuthorities().stream()
                        .map(authority -> authority.getAuthority())
                        .collect(Collectors.toSet()),
                warehouseIds,
                emitter
        );

        connections.put(connectionId, connection);
        emitter.onCompletion(() -> removeConnection(connectionId));
        emitter.onTimeout(() -> removeConnection(connectionId));
        emitter.onError(error -> removeConnection(connectionId));

        send(connection, EVENT_CONNECTED, java.util.Map.of("status", "ok"));
        return emitter;
    }

    public void publishUserUpdated(UserDto user, String reason) {
        RealtimeUserEvent payload = RealtimeUserEvent.builder()
                .reason(reason)
                .user(user)
                .build();

        sendToMatching(connection -> connection.userId.equals(user.getId()), EVENT_USER_UPDATED, payload);
        sendToMatching(this::isAdminConnection, EVENT_USER_UPDATED, payload);
    }

    public void forceLogoutUser(Long userId, String reason, String message) {
        RealtimeForceLogoutEvent payload = RealtimeForceLogoutEvent.builder()
                .reason(reason)
                .message(message)
                .build();
        sendToMatching(connection -> connection.userId.equals(userId), EVENT_FORCE_LOGOUT, payload);
    }

    /**
     * Tài khoản vừa đăng nhập ở nơi khác: đăng xuất các kết nối thuộc phiên cũ (khác {@code currentSessionId})
     * rồi đóng kết nối, token của chúng đã hết hiệu lực.
     */
    public void forceLogoutOtherSessions(Long userId, String currentSessionId, String reason, String message) {
        connections.values().stream()
                .filter(connection -> connection.userId.equals(userId)
                        && !Objects.equals(connection.sessionId, currentSessionId))
                .toList()
                .forEach(connection -> forceLogoutAndClose(connection, reason, message));
    }

    private void forceLogoutAndClose(ClientConnection connection, String reason, String message) {
        send(connection, EVENT_FORCE_LOGOUT, RealtimeForceLogoutEvent.builder()
                .reason(reason)
                .message(message)
                .build());
        removeConnection(connection.connectionId);
    }

    /**
     * Lưới an toàn cho "mỗi tài khoản một phiên": đóng kết nối của phiên đã bị thay (đăng nhập nơi khác) hoặc bị thu
     * hồi (đổi mật khẩu) mà sự kiện lúc đó không tới được, ví dụ máy kia đang mất mạng rồi kết nối lại bằng kết nối cũ.
     */
    void closeRevokedSessions() {
        // Chụp danh sách TRƯỚC khi đọc DB: kết nối nào có trong danh sách đã mở trước lần đọc, nên phiên của nó khác
        // phiên trong DB nghĩa là đã bị thay thật (mã phiên luôn mới, không bao giờ quay lại giá trị cũ).
        List<ClientConnection> snapshot = List.copyOf(connections.values());
        if (snapshot.isEmpty()) {
            return;
        }
        Set<Long> userIds = snapshot.stream().map(ClientConnection::userId).collect(Collectors.toSet());
        Map<Long, String> currentSessionIds = new HashMap<>();
        for (Object[] row : userRepository.findCurrentSessionIds(userIds)) {
            currentSessionIds.put((Long) row[0], (String) row[1]);
        }
        for (ClientConnection connection : snapshot) {
            String currentSessionId = currentSessionIds.get(connection.userId);
            if (!Objects.equals(currentSessionId, connection.sessionId)) {
                SystemMessage reason = currentSessionId != null ? SystemMessage.SESSION_REPLACED : SystemMessage.SESSION_EXPIRED;
                forceLogoutAndClose(connection, reason.name(), reason.getMessage());
            }
        }
    }

    public void publishNotification(AppNotification notification) {
        if (notification.getUserId() != null) {
            sendToMatching(connection -> notification.getUserId().equals(connection.userId), EVENT_NOTIFICATION, notification);
        } else if (notification.getRecipientRole() != null) {
            sendToMatching(connection -> connection.authorities.contains(notification.getRecipientRole())
                    && (notification.getWarehouseId() == null || isAdminConnection(connection) || connection.warehouseIds.contains(notification.getWarehouseId())),
                    EVENT_NOTIFICATION, notification);
        }
    }

    public void publishDataChanged(DataChangedPayload payload) {
        if (TOPIC_USER.equals(payload.topic())) {
            sendToMatching(this::isAdminConnection, EVENT_DATA_CHANGED, payload);
        } else {
            sendToMatching(connection -> true, EVENT_DATA_CHANGED, payload);
        }
    }

    private boolean isAdminConnection(ClientConnection connection) {
        return connection.authorities.contains("ROLE_SUPER_ADMIN")
                || connection.authorities.contains("ROLE_MANAGER");
    }

    private boolean isSuperAdminConnection(ClientConnection connection) {
        return connection.authorities.contains("ROLE_SUPER_ADMIN");
    }

    private void broadcastSystemHealth() {
        boolean hasSuperAdminViewer = connections.values().stream().anyMatch(this::isSuperAdminConnection);
        if (!hasSuperAdminViewer) {
            return;
        }
        try {
            SystemHealthDto health = systemHealthService.getHealth();
            sendToMatching(this::isSuperAdminConnection, EVENT_SYSTEM_HEALTH, health);
        } catch (Exception ex) {
            log.warn("Failed to broadcast system health: {}", ex.getMessage());
        }
    }

    private void sendHeartbeat() {
        connections.values().forEach(connection -> send(connection, EVENT_PING, java.util.Map.of("ts", System.currentTimeMillis())));
    }

    private void sendToMatching(Predicate<ClientConnection> predicate, String eventName, Object payload) {
        connections.values().stream()
                .filter(predicate)
                .collect(Collectors.toMap(ClientConnection::connectionId, connection -> connection, (left, right) -> left))
                .values()
                .forEach(connection -> send(connection, eventName, payload));
    }

    private void send(ClientConnection connection, String eventName, Object payload) {
        try {
            // SseEmitter không an toàn khi nhiều luồng ghi cùng lúc (heartbeat, thông báo, data-changed).
            synchronized (connection.emitter) {
                connection.emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(payload));
            }
        } catch (Exception ex) {
            log.debug("Closing realtime connection {} after send failure: {}", connection.connectionId, ex.getMessage());
            removeConnection(connection.connectionId);
        }
    }

    private void removeConnection(String connectionId) {
        ClientConnection removed = connections.remove(connectionId);
        if (removed != null) {
            try {
                removed.emitter.complete();
            } catch (Exception ex) {
                // Kết nối đã hỏng (client ngắt): Tomcat ném lỗi khi complete(). Nuốt tại đây, nếu không lỗi thoát
                // khỏi send() và làm dừng vòng gửi của sendToMatching, các client còn lại không nhận được sự kiện.
                log.debug("Realtime connection {} already closed: {}", connectionId, ex.getMessage());
            }
        }
    }

    private record ClientConnection(String connectionId, Long userId, String sessionId, Set<String> authorities, Set<Long> warehouseIds, SseEmitter emitter) {
    }
}
