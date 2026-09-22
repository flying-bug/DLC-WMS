package com.duylongtech.backend.feature.ai.agent;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Cấu hình AI Agent (function calling). Tắt mặc định: bật bằng AI_AGENT_ENABLED=true kèm
 * AI_AGENT_MODEL_PROVIDER=openai|google-genai (xem application.yaml). Tắt thì chatbot chạy đúng như cũ.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "ai.agent")
public class AiAgentProperties {
    private boolean enabled = false;
    /** Số lần gọi công cụ tối đa cho MỘT câu hỏi (chống vòng lặp và chi phí). */
    private int maxToolCalls = 6;
    /** Số dòng tối đa mỗi công cụ trả về cho mô hình. */
    private int maxRows = 10;
    /** Số lượt hội thoại gần nhất đưa vào ngữ cảnh. */
    private int historyTurns = 6;
}
