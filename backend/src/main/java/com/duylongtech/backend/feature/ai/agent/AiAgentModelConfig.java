package com.duylongtech.backend.feature.ai.agent;

import com.google.genai.Client;
import com.google.genai.types.HttpOptions;
import com.google.genai.types.HttpRetryOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Timeout HTTP cho Gemini. Spring AI tự tạo com.google.genai.Client KHÔNG có timeout, nên một lời gọi mô hình bị treo sẽ
 * giữ request (và thread Tomcat) gần như mãi mãi và không bao giờ quay về đường trả lời cũ. Bean đó của Spring AI là
 * {@code @ConditionalOnMissingBean}, nên khai báo Client ở đây sẽ thay thế nó. Chỉ hỗ trợ API key (dự án không dùng
 * Vertex AI). OpenAI không cần lớp này: timeout đặt bằng spring.ai.openai.timeout trong application.yaml.
 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "spring.ai.model", name = "chat", havingValue = "google-genai")
public class AiAgentModelConfig {

    /**
     * Đọc timeout bằng @Value, KHÔNG inject AiAgentProperties: Client được Spring AI tạo sớm (trước khi các bean
     * @ConfigurationProperties được bind), kéo theo AiAgentProperties bị tạo sớm và giữ nguyên giá trị mặc định,
     * tức ai.agent.enabled luôn false.
     */
    @Bean
    public Client agentGoogleGenAiClient(@Value("${spring.ai.google.genai.api-key}") String apiKey,
                                         @Value("${ai.agent.timeout-seconds:30}") int timeoutSeconds) {
        return Client.builder()
                .apiKey(apiKey)
                .httpOptions(httpOptions(timeoutSeconds))
                .build();
    }

    /** Timeout = hạn của một câu hỏi; không thử lại (lỗi thì chatbot quay về đường cũ thay vì bắt người dùng chờ). */
    static HttpOptions httpOptions(int timeoutSeconds) {
        return HttpOptions.builder()
                .timeout(Math.max(1, timeoutSeconds) * 1000)
                .retryOptions(HttpRetryOptions.builder().attempts(1).build())
                .build();
    }
}
