package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AiChatRequest {
    @NotBlank(message = "Cau hoi khong duoc de trong")
    @Size(max = 2000, message = "Cau hoi khong duoc vuot qua 2000 ky tu")
    private String message;
}
