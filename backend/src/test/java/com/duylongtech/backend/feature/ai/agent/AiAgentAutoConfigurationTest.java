package com.duylongtech.backend.feature.ai.agent;

import com.google.genai.Client;
import com.google.genai.types.HttpOptions;
import com.google.genai.types.HttpRetryOptions;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.model.chat.client.autoconfigure.ChatClientAutoConfiguration;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.model.google.genai.autoconfigure.chat.GoogleGenAiChatAutoConfiguration;
import org.springframework.ai.model.openai.autoconfigure.OpenAiAudioSpeechAutoConfiguration;
import org.springframework.ai.model.openai.autoconfigure.OpenAiAudioTranscriptionAutoConfiguration;
import org.springframework.ai.model.openai.autoconfigure.OpenAiChatAutoConfiguration;
import org.springframework.ai.model.openai.autoconfigure.OpenAiCommonProperties;
import org.springframework.ai.model.openai.autoconfigure.OpenAiEmbeddingAutoConfiguration;
import org.springframework.ai.model.openai.autoconfigure.OpenAiImageAutoConfiguration;
import org.springframework.ai.model.openai.autoconfigure.OpenAiModerationAutoConfiguration;
import org.springframework.ai.model.tool.autoconfigure.ToolCallingAutoConfiguration;
import org.springframework.ai.retry.autoconfigure.SpringAiRetryAutoConfiguration;
import org.springframework.ai.retry.autoconfigure.SpringAiRetryProperties;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import java.time.Duration;

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
    void aHungModelCallFailsWithinTheQuestionTimeLimitAndIsNeverRetried() {
        runner.withPropertyValues("spring.ai.model.chat=openai").run(context -> {
            OpenAiCommonProperties openAi = context.getBean(OpenAiCommonProperties.class);
            assertThat(openAi.getTimeout()).isEqualTo(Duration.ofSeconds(30));
            assertThat(openAi.getMaxRetries()).isZero();
            // Mặc định Spring AI thử lại 10 lần, chờ tới 3 phút giữa các lần.
            assertThat(context.getBean(SpringAiRetryProperties.class).getMaxAttempts()).isZero();
        });
    }

    @Test
    void geminiUsesOurClientWithATimeoutInsteadOfTheUnboundedDefault() {
        runner.withUserConfiguration(AiAgentModelConfig.class, AiAgentProperties.class)
                .withPropertyValues("spring.ai.model.chat=google-genai", "ai.agent.enabled=true", "ai.agent.timeout-seconds=25")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasSingleBean(Client.class);
                    assertThat(context).hasBean("agentGoogleGenAiClient");
                    assertThat(context).hasSingleBean(ChatModel.class);
                    // Client được tạo sớm; nếu nó kéo AiAgentProperties theo thì cấu hình không được bind và agent luôn tắt.
                    AiAgentProperties agent = context.getBean(AiAgentProperties.class);
                    assertThat(agent.isEnabled()).isTrue();
                    assertThat(agent.getTimeoutSeconds()).isEqualTo(25);
                });

        HttpOptions options = AiAgentModelConfig.httpOptions(25);
        assertThat(options.timeout()).contains(25_000);
        assertThat(options.retryOptions().flatMap(HttpRetryOptions::attempts)).contains(1);
    }

    @Test
    void ourGeminiClientStaysOutOfTheWayWhenAnotherProviderIsSelected() {
        runner.withUserConfiguration(AiAgentModelConfig.class, AiAgentProperties.class).run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context).doesNotHaveBean(Client.class);
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
