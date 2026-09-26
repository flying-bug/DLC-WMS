package com.duylongtech.backend.feature.ai.agent;

import com.duylongtech.backend.feature.ai.agent.tool.AiToolSupport;
import com.duylongtech.backend.feature.ai.agent.tool.PartnerTools;
import com.duylongtech.backend.feature.ai.agent.tool.ProductTools;
import com.duylongtech.backend.feature.ai.agent.tool.StockTools;
import com.duylongtech.backend.feature.ai.dto.AiChatMessageDto;
import com.duylongtech.backend.feature.ai.dto.AiChatResponse;
import com.duylongtech.backend.feature.ai.service.AiAccessPolicy;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.warehouse.WarehouseAccessGuard;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.ToolResponseMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.model.tool.ToolCallingManager;
import org.springframework.ai.model.tool.ToolExecutionResult;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Chạy AiAgentService với ChatClient THẬT của Spring AI và một mô hình giả biết gọi công cụ đúng như nhà cung cấp thật
 * (mô hình yêu cầu tool -> ToolCallingManager thực thi trên cùng luồng -> mô hình nhận kết quả rồi trả lời).
 */
class AiAgentServiceTest {

    private ProductVariantRepository variantRepository;
    private AiAgentProperties properties;
    private AiAgentService service;
    private ScriptedChatModel model;

    /** Mô hình giả: lần đầu yêu cầu gọi một công cụ, khi đã có kết quả công cụ thì trả lời bằng finalText. */
    private static final class ScriptedChatModel implements ChatModel {
        private final ToolCallingManager toolCallingManager = ToolCallingManager.builder().build();
        private final List<Prompt> prompts = new ArrayList<>();
        private final String toolName;
        private final String toolArguments;
        private final String finalText;
        private RuntimeException failure;

        ScriptedChatModel(String toolName, String toolArguments, String finalText) {
            this.toolName = toolName;
            this.toolArguments = toolArguments;
            this.finalText = finalText;
        }

        /** Như các nhà cung cấp thật: mô hình dùng ToolCallingChatOptions để ChatClient gắn công cụ vào request. */
        @Override
        public org.springframework.ai.chat.prompt.ChatOptions getOptions() {
            return org.springframework.ai.model.tool.ToolCallingChatOptions.builder().build();
        }

        @Override
        public ChatResponse call(Prompt prompt) {
            prompts.add(prompt);
            if (failure != null) {
                throw failure;
            }
            boolean hasToolResult = prompt.getInstructions().stream().anyMatch(m -> m instanceof ToolResponseMessage);
            if (!hasToolResult && toolName != null) {
                AssistantMessage request = AssistantMessage.builder()
                        .content("")
                        .toolCalls(List.of(new AssistantMessage.ToolCall("call-1", "function", toolName, toolArguments)))
                        .build();
                ChatResponse toolRequest = new ChatResponse(List.of(new Generation(request)));
                ToolExecutionResult executed = toolCallingManager.executeToolCalls(prompt, toolRequest);
                return call(new Prompt(executed.conversationHistory(), prompt.getOptions()));
            }
            return new ChatResponse(List.of(new Generation(new AssistantMessage(finalText))));
        }

        String toolResultSeenByModel() {
            return prompts.stream().flatMap(p -> p.getInstructions().stream())
                    .filter(m -> m instanceof ToolResponseMessage)
                    .map(m -> ((ToolResponseMessage) m).getResponses().get(0).responseData())
                    .findFirst().orElse("");
        }
    }

    @BeforeEach
    void setUp() {
        variantRepository = mock(ProductVariantRepository.class);
        properties = new AiAgentProperties();
        properties.setEnabled(true);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        AiAgentRun.end();
    }

    private void build(ScriptedChatModel scripted) {
        model = scripted;
        WarehouseAccessGuard guard = mock(WarehouseAccessGuard.class);
        AiToolSupport support = new AiToolSupport(new AiAccessPolicy(guard), properties, mock(WarehouseRepository.class));
        @SuppressWarnings("unchecked")
        ObjectProvider<ChatClient.Builder> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenAnswer(inv -> ChatClient.builder(model));
        when(provider.getObject()).thenAnswer(inv -> ChatClient.builder(model));
        @SuppressWarnings("unchecked")
        ObjectProvider<ChatModel> modelProvider = mock(ObjectProvider.class);
        when(modelProvider.getIfAvailable()).thenReturn(model);
        service = new AiAgentService(properties, modelProvider, provider,
                new ProductTools(variantRepository, support),
                new StockTools(mock(InventoryBalanceRepository.class), support),
                new PartnerTools(mock(PartnerRepository.class), support),
                mock(com.duylongtech.backend.feature.ai.agent.tool.DocumentTools.class));
    }

    private static void loginAs(String... authorities) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("tester", "x",
                Arrays.stream(authorities).map(SimpleGrantedAuthority::new).toList()));
    }

    private static ProductVariant variant() {
        ProductVariant v = mock(ProductVariant.class);
        Product p = mock(Product.class);
        when(p.getProductCode()).thenReturn("SP01");
        when(p.getProductName()).thenReturn("RAM Kingston");
        when(v.getProduct()).thenReturn(p);
        when(v.getSku()).thenReturn("SKU-1");
        when(v.getVariantName()).thenReturn("16GB DDR4");
        when(v.getSalePrice()).thenReturn(new BigDecimal("950000"));
        return v;
    }

    @Test
    void toolRunsOnTheCallersThreadWithTheirSecurityContextAndTheAnswerListsTheToolUsed() {
        loginAs("product:view", "ROLE_TECHNICIAN");
        ProductVariant found = variant();
        when(variantRepository.searchVariants(anyString(), anyBoolean(), any(Pageable.class))).thenReturn(new PageImpl<>(List.of(found)));
        build(new ScriptedChatModel("searchProducts", "{\"keyword\":\"ram ddr4\"}", "Có 1 SKU: SKU-1."));

        Optional<AiChatResponse> answer = service.answer("Tìm RAM DDR4", List.of());

        assertTrue(answer.isPresent());
        assertEquals("AGENT_ANSWER", answer.get().getIntent());
        assertEquals("Có 1 SKU: SKU-1.", answer.get().getAnswer());
        assertEquals("searchProducts", answer.get().getSources().get(0).getName());
        String seenByModel = model.toolResultSeenByModel();
        assertTrue(seenByModel.contains("SKU-1"), seenByModel);
        assertFalse(seenByModel.contains("salePrice"), "kỹ thuật viên không được xem giá, kể cả qua mô hình");
        assertNull(AiAgentRun.current(), "ngữ cảnh câu hỏi phải được dọn sau khi xong");
    }

    @Test
    void aDeniedToolGivesTheModelAnErrorInsteadOfDataAndNeverQueriesTheDatabase() {
        loginAs("customer:view");
        build(new ScriptedChatModel("searchProducts", "{\"keyword\":\"ram\"}", "Bạn chưa có quyền xem sản phẩm."));

        Optional<AiChatResponse> answer = service.answer("Tìm RAM", List.of());

        assertTrue(answer.isPresent());
        assertTrue(model.toolResultSeenByModel().contains("không có quyền"), model.toolResultSeenByModel());
        verify(variantRepository, never()).searchVariants(anyString(), anyBoolean(), any(Pageable.class));
    }

    @Test
    void systemPromptAndRecentHistoryAreSentToTheModel() {
        loginAs("product:view");
        build(new ScriptedChatModel(null, null, "Xin chào."));
        List<AiChatMessageDto> history = List.of(
                AiChatMessageDto.builder().role("user").content("Kho Hà Nội còn RAM không?").build(),
                AiChatMessageDto.builder().role("assistant").content("Còn 12 cái.").build());

        service.answer("Còn nhà cung cấp nào bán?", history);

        List<Message> sent = model.prompts.get(0).getInstructions();
        assertTrue(sent.get(0) instanceof SystemMessage, "prompt hệ thống phải đứng đầu");
        assertTrue(sent.get(0).getText().contains("KHÔNG") || sent.get(0).getText().contains("Không"), "có quy tắc bảo mật");
        assertTrue(sent.stream().anyMatch(m -> m instanceof UserMessage && m.getText().contains("Kho Hà Nội còn RAM")));
        assertTrue(sent.stream().anyMatch(m -> m instanceof AssistantMessage && m.getText().contains("Còn 12 cái")));
        assertTrue(sent.get(sent.size() - 1).getText().contains("nhà cung cấp nào bán"), "câu hỏi hiện tại đứng cuối");
    }

    @Test
    void modelFailureFallsBackToTheClassicAnswer() {
        loginAs("product:view");
        ScriptedChatModel failing = new ScriptedChatModel(null, null, "x");
        failing.failure = new IllegalStateException("provider down");
        build(failing);

        assertTrue(service.answer("Tìm RAM", List.of()).isEmpty());
        assertNull(AiAgentRun.current());
    }

    @Test
    void agentIsUnavailableWhenDisabledOrWhenNoChatModelIsConfigured() {
        build(new ScriptedChatModel(null, null, "x"));
        properties.setEnabled(false);
        assertFalse(service.isAvailable());
        assertTrue(service.answer("Tìm RAM", List.of()).isEmpty());

        @SuppressWarnings("unchecked")
        ObjectProvider<ChatClient.Builder> none = mock(ObjectProvider.class);
        when(none.getIfAvailable()).thenReturn(null);
        properties.setEnabled(true);
        @SuppressWarnings("unchecked")
        ObjectProvider<ChatModel> noModel = mock(ObjectProvider.class);
        when(noModel.getIfAvailable()).thenReturn(null);
        // Builder có sẵn (Spring AI luôn tạo) nhưng không có ChatModel -> vẫn phải coi là không khả dụng
        when(none.getIfAvailable()).thenAnswer(inv -> ChatClient.builder(model));
        AiAgentService withoutModel = new AiAgentService(properties, noModel, none, null, null, null, null);
        assertFalse(withoutModel.isAvailable());
    }
}
