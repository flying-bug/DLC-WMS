package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.UserDto;
import com.duylongtech.backend.dto.response.RealtimeForceLogoutEvent;
import com.duylongtech.backend.dto.response.RealtimeUserEvent;
import com.duylongtech.backend.security.UserDetailsImpl;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
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

@Slf4j
@Service
public class RealtimeSessionService {

    private static final long SSE_TIMEOUT_MILLIS = 0L;
    private static final String EVENT_CONNECTED = "connected";
    private static final String EVENT_PING = "ping";
    private static final String EVENT_USER_UPDATED = "user-updated";
    private static final String EVENT_FORCE_LOGOUT = "force-logout";

    private final ConcurrentMap<String, ClientConnection> connections = new ConcurrentHashMap<>();
    private final ScheduledExecutorService heartbeatExecutor = Executors.newSingleThreadScheduledExecutor();

    @PostConstruct
    void startHeartbeat() {
        heartbeatExecutor.scheduleAtFixedRate(this::sendHeartbeat, 20, 20, TimeUnit.SECONDS);
    }

    @PreDestroy
    void shutdown() {
        heartbeatExecutor.shutdownNow();
        connections.values().forEach(connection -> connection.emitter.complete());
        connections.clear();
    }

    public SseEmitter subscribe(UserDetailsImpl userDetails) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MILLIS);
        String connectionId = UUID.randomUUID().toString();
        ClientConnection connection = new ClientConnection(
                connectionId,
                userDetails.getId(),
                userDetails.getAuthorities().stream()
                        .map(authority -> authority.getAuthority())
                        .collect(Collectors.toSet()),
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

    private boolean isAdminConnection(ClientConnection connection) {
        return connection.authorities.contains("ROLE_SUPER_ADMIN")
                || connection.authorities.contains("ROLE_MANAGER");
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
            connection.emitter.send(SseEmitter.event()
                    .name(eventName)
                    .data(payload));
        } catch (IOException ex) {
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

    private record ClientConnection(String connectionId, Long userId, Set<String> authorities, SseEmitter emitter) {
    }
}
