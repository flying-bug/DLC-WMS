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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.duylongtech.backend.entity.AiChatLog;
import com.duylongtech.backend.repository.AiChatLogRepository;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiChatController {
    private final AiChatService aiChatService;
    private final VoiceCommandService voiceCommandService;
    private final AiChatLogRepository aiChatLogRepository;
    private final com.duylongtech.backend.service.SystemSettingsService settingsService;

    @PostMapping("/chat")
    @PreAuthorize("hasAuthority('ai_chat:view')")
    public ResponseEntity<ApiResponse<AiChatResponse>> chat(@Valid @RequestBody AiChatRequest request) {
        if (!settingsService.isAiEnabled()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("AI_DISABLED", "Tính năng Trí tuệ nhân tạo (AI) hiện đang tạm khóa bởi Quản trị viên."));
        }
        AiChatResponse response = aiChatService.chat(request.getMessage(), request.getHistory());
        
        Long userId = null;
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof com.duylongtech.backend.security.UserDetailsImpl userDetails) {
            userId = userDetails.getId();
        }

        AiChatLog log = AiChatLog.builder()
                .userId(userId)
                .question(request.getMessage())
                .answer(response.getAnswer())
                .build();
        aiChatLogRepository.save(log);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/voice-command")
    @PreAuthorize("hasAuthority('ai_chat:view')")
    public ResponseEntity<ApiResponse<VoiceCommandResponse>> voiceCommand(@Valid @RequestBody AiChatRequest request) {
        if (!settingsService.isAiEnabled()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("AI_DISABLED", "Tính năng Trí tuệ nhân tạo (AI) hiện đang tạm khóa bởi Quản trị viên."));
        }
        return ResponseEntity.ok(ApiResponse.success(voiceCommandService.parseVoiceCommand(request.getMessage())));
    }

    @GetMapping("/insights/frequent-questions")
    @PreAuthorize("hasAuthority('ai_chat:view')")
    public ResponseEntity<ApiResponse<List<String>>> getFrequentQuestions() {
        List<Object[]> topQuestions = aiChatLogRepository.findTopQuestions();
        List<String> questions = topQuestions.stream()
                .map(obj -> (String) obj[0])
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(questions));
    }
}
