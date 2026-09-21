package com.duylongtech.backend.feature.notification;

import com.duylongtech.backend.feature.auth.UserDto;
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

import java.io.IOException;
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

    private final ConcurrentMap<String, ClientConnection> connections = new ConcurrentHashMap<>();
    private final ScheduledExecutorService heartbeatExecutor = Executors.newSingleThreadScheduledExecutor();

    @PostConstruct
    void startHeartbeat() {
        heartbeatExecutor.scheduleAtFixedRate(this::sendHeartbeat, 20, 20, TimeUnit.SECONDS);
        heartbeatExecutor.scheduleAtFixedRate(this::broadcastSystemHealth, 10, 10, TimeUnit.SECONDS);
    }

    @PreDestroy
    void shutdown() {
        heartbeatExecutor.shutdownNow();
        connections.values().forEach(connection -> connection.emitter.complete());
        connections.clear();
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
        } catch (IOException | IllegalStateException ex) {
            log.debug("Closing realtime connection {} after send failure: {}", connection.connectionId, ex.getMessage());
            removeConnection(connection.connectionId);
        }
    }

    private void removeConnection(String connectionId) {
        ClientConnection removed = connections.remove(connectionId);
        if (removed != null) {
            removed.emitter.complete();
        }
    }

    private record ClientConnection(String connectionId, Long userId, Set<String> authorities, Set<Long> warehouseIds, SseEmitter emitter) {
    }
}
