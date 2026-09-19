package com.duylongtech.backend.feature.notification;

import com.duylongtech.backend.security.UserDetailsImpl;
import com.duylongtech.backend.feature.notification.RealtimeSessionService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/realtime")
@RequiredArgsConstructor
public class RealtimeController {

    private final RealtimeSessionService realtimeSessionService;

    @GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal UserDetailsImpl userDetails, HttpServletResponse response) {
        // Chặn proxy (nginx...) buffer luồng SSE làm sự kiện đến trễ.
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache, no-transform");
        return realtimeSessionService.subscribe(userDetails);
    }
}
