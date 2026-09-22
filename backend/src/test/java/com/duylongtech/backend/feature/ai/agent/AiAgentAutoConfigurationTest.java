package com.duylongtech.backend.feature.ai.agent;

import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.model.chat.client.autoconfigure.ChatClientAutoConfiguration;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.model.google.genai.autoconfigure.chat.GoogleGenAiChatAutoConfiguration;
import org.springframework.ai.model.openai.autoconfigure.OpenAiAudioSpeechAutoConfiguration;
import org.springframework.ai.model.openai.autoconfigure.OpenAiAudioTranscriptionAutoConfiguration;
import org.springframework.ai.model.openai.autoconfigure.OpenAiChatAutoConfiguration;
import org.springframework.ai.model.openai.autoconfigure.OpenAiEmbeddingAutoConfiguration;
import org.springframework.ai.model.openai.autoconfigure.OpenAiImageAutoConfiguration;
import org.springframework.ai.model.openai.autoconfigure.OpenAiModerationAutoConfiguration;
import org.springframework.ai.model.tool.autoconfigure.ToolCallingAutoConfiguration;
import org.springframework.ai.retry.autoconfigure.SpringAiRetryAutoConfiguration;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Kiểm tra cấu hình THẬT trong application.yaml: mặc định Spring AI phải tắt hẳn (nếu không, thiếu API key là backend
 * không khởi động được và deploy hỏng), và chỉ khi chọn nhà cung cấp mới có ChatModel + ChatClient.Builder.
 */
class AiAgentAutoConfigurationTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withInitializer(new ConfigDataApplicationContextInitializer())
            .withConfiguration(AutoConfigurations.of(
                    SpringAiRetryAutoConfiguration.class,
                    ToolCallingAutoConfiguration.class,
                    OpenAiChatAutoConfiguration.class,
                    OpenAiEmbeddingAutoConfiguration.class,
                    OpenAiImageAutoConfiguration.class,
                    OpenAiAudioSpeechAutoConfiguration.class,
                    OpenAiAudioTranscriptionAutoConfiguration.class,
                    OpenAiModerationAutoConfiguration.class,
                    GoogleGenAiChatAutoConfiguration.class,
                    ChatClientAutoConfiguration.class));

    @Test
    void springAiIsFullyOffByDefaultAndTheApplicationStillStartsWithoutApiKeys() {
        runner.run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).doesNotHaveBean(ChatModel.class);
        });
    }

    @Test
    void selectingOpenAiProvidesAChatModelAndAChatClientBuilder() {
        runner.withPropertyValues("spring.ai.model.chat=openai").run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).hasSingleBean(ChatModel.class);
            assertThat(context).hasBean("openAiChatModel");
            assertThat(context).hasSingleBean(ChatClient.Builder.class);
        });
    }

    @Test
    void selectingGeminiProvidesExactlyOneChatModel() {
        runner.withPropertyValues("spring.ai.model.chat=google-genai").run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).hasSingleBean(ChatModel.class);
            assertThat(context).hasSingleBean(ChatClient.Builder.class);
        });
    }
}
