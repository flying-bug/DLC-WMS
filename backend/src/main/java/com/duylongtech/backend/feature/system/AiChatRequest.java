package com.duylongtech.backend.feature.system;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class AiChatRequest {
    @NotBlank(message = "Câu hỏi không được để trống")
    @Size(max = 2000, message = "Câu hỏi không được vượt quá 2000 ký tự")
    private String message;

    private List<AiChatMessageDto> history;
}
