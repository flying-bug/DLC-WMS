package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.AiChatRequest;
import com.duylongtech.backend.dto.response.AiChatResponse;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.VoiceCommandResponse;
import com.duylongtech.backend.service.AiChatService;
import com.duylongtech.backend.service.VoiceCommandService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiChatController {
    private final AiChatService aiChatService;
    private final VoiceCommandService voiceCommandService;

    @PostMapping("/chat")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AiChatResponse>> chat(@Valid @RequestBody AiChatRequest request) {
        return ResponseEntity.ok(ApiResponse.success(aiChatService.chat(request.getMessage())));
    }

    @PostMapping("/voice-command")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<VoiceCommandResponse>> voiceCommand(@Valid @RequestBody AiChatRequest request) {
        return ResponseEntity.ok(ApiResponse.success(voiceCommandService.parseVoiceCommand(request.getMessage())));
    }
}
