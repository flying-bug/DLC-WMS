package com.duylongtech.backend.feature.notification;

import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.system.SystemHealthService;
import com.duylongtech.backend.feature.warehouse.UserWarehouseRoleRepository;
import com.duylongtech.backend.security.UserDetailsImpl;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RealtimeSessionServiceSingleSessionTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final RealtimeSessionService service = createService();

    private RealtimeSessionService createService() {
        UserWarehouseRoleRepository warehouseRoles = mock(UserWarehouseRoleRepository.class);
        when(warehouseRoles.findByUserId(anyLong())).thenReturn(List.of());
        return new RealtimeSessionService(mock(SystemHealthService.class), warehouseRoles, userRepository);
    }

    private SseEmitter connect(long userId, String sessionId) {
        return service.subscribe(new UserDetailsImpl(userId, "u" + userId, "x", true, List.of(), sessionId));
    }

    @SuppressWarnings("unchecked")
    private Set<SseEmitter> openEmitters() {
        Map<String, Object> connections = (Map<String, Object>) ReflectionTestUtils.getField(service, "connections");
        return connections.values().stream()
                .map(connection -> (SseEmitter) ReflectionTestUtils.invokeMethod(connection, "emitter"))
                .collect(Collectors.toSet());
    }

    @Test
    void loginElsewhereClosesOnlyConnectionsOfPreviousSession() {
        SseEmitter oldSession = connect(1L, "session-A");
        SseEmitter newSession = connect(1L, "session-B");
        SseEmitter otherUser = connect(2L, "session-C");

        service.forceLogoutOtherSessions(1L, "session-B", "SESSION_REPLACED", "Bạn đã đăng nhập ở một nơi khác.");

        Set<SseEmitter> open = openEmitters();
        assertEquals(Set.of(newSession, otherUser), open);
        assertEquals(false, open.contains(oldSession));
    }

    @Test
    void periodicCheckClosesReplacedAndRevokedSessions() {
        connect(1L, "session-A");
        SseEmitter current = connect(1L, "session-B");
        connect(2L, "session-C");
        when(userRepository.findCurrentSessionIds(any())).thenReturn(List.of(
                new Object[]{1L, "session-B"},
                new Object[]{2L, null}));

        service.closeRevokedSessions();

        assertEquals(Set.of(current), openEmitters());
    }
}
