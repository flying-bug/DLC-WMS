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

public interface RealtimeSessionService {
    SseEmitter subscribe(UserDetailsImpl userDetails);
    void publishUserUpdated(UserDto user, String reason);
    void forceLogoutUser(Long userId, String reason, String message);
}
