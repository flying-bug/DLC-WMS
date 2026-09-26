package com.duylongtech.backend.feature.ai.service;

import com.duylongtech.backend.feature.ai.agent.AiAgentProperties;
import com.duylongtech.backend.feature.ai.agent.AiAgentService;
import com.duylongtech.backend.feature.ai.agent.tool.AiToolSupport;
import com.duylongtech.backend.feature.ai.agent.tool.DocumentTools;
import com.duylongtech.backend.feature.ai.agent.tool.PartnerTools;
import com.duylongtech.backend.feature.ai.agent.tool.ProductTools;
import com.duylongtech.backend.feature.ai.agent.tool.StockTools;
import com.duylongtech.backend.feature.ai.client.AiModelClient;
import com.duylongtech.backend.feature.ai.dto.AiChatResponse;
import com.duylongtech.backend.feature.assembly.AssemblyOrderRepository;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.ProductRepository;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderRepository;
import com.duylongtech.backend.feature.repair.RepairRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.warehouse.StockTransferRepository;
import com.duylongtech.backend.feature.warehouse.WarehouseAccessGuard;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import com.duylongtech.backend.feature.warranty.WarrantyRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Answers;
import org.mockito.stubbing.Answer;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.ToolResponseMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.model.tool.ToolCallingChatOptions;
import org.springframework.ai.model.tool.ToolCallingManager;
import org.springframework.ai.model.tool.ToolExecutionResult;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;

/**
 * Không được giữ kết nối DB trong lúc chờ mô hình AI (Hikari từng cạn kết nối): với JPA, kết nối bị giữ từ lúc transaction
 * bắt đầu tới lúc commit. Test chạy AiChatService, AiAgentService và các công cụ như bean Spring THẬT (có proxy
 * {@code @Transactional}) với một transaction manager ghi lại begin/commit, rồi ghi lại mỗi lần đọc DB và mỗi lần gọi mô
 * hình cùng trạng thái transaction lúc đó. Dữ liệu phải được đọc trong transaction chỉ-đọc (quan hệ LAZY đọc được) và
 * transaction đó phải đóng trước mỗi lời gọi mô hình.
 */
class AiChatServiceTransactionTest {

    private final List<String> timeline = new ArrayList<>();
    private AnnotationConfigApplicationContext context;
    private AiAgentProperties agentProperties;
    private AiChatService service;

    @Configuration(proxyBeanMethods = false)
    @EnableTransactionManagement
    static class TransactionConfig {
    }

    /** Đi qua đúng cơ chế transaction của Spring (TransactionSynchronizationManager), chỉ không có DB thật. */
    private static final class RecordingTransactionManager extends AbstractPlatformTransactionManager {
        private final List<String> timeline;
        private final ThreadLocal<Boolean> active = ThreadLocal.withInitial(() -> false);

        RecordingTransactionManager(List<String> timeline) {
            this.timeline = timeline;
        }

        @Override
        protected Object doGetTransaction() {
            return new Object();
        }

        @Override
        protected boolean isExistingTransaction(Object transaction) {
            return active.get();
        }

        @Override
        protected void doBegin(Object transaction, TransactionDefinition definition) {
            active.set(true);
            timeline.add(definition.isReadOnly() ? "begin read-only tx" : "begin read-write tx");
        }

        @Override
        protected void doCommit(DefaultTransactionStatus status) {
            timeline.add("commit");
        }

        @Override
        protected void doRollback(DefaultTransactionStatus status) {
            timeline.add("rollback");
        }

        @Override
        protected void doCleanupAfterCompletion(Object transaction) {
            active.remove();
        }
    }

    /** Mô hình giả gọi công cụ như nhà cung cấp thật: yêu cầu searchPartners, nhận kết quả rồi trả lời, trên cùng luồng. */
    private final class ScriptedChatModel implements ChatModel {
        private final ToolCallingManager toolCallingManager = ToolCallingManager.builder().build();

        @Override
        public ChatOptions getOptions() {
            return ToolCallingChatOptions.builder().build();
        }

        @Override
        public ChatResponse call(Prompt prompt) {
            timeline.add("model call" + transactionState());
            boolean hasToolResult = prompt.getInstructions().stream().anyMatch(m -> m instanceof ToolResponseMessage);
            if (!hasToolResult) {
                AssistantMessage request = AssistantMessage.builder()
                        .content("")
                        .toolCalls(List.of(new AssistantMessage.ToolCall("call-1", "function", "searchPartners",
                                "{\"keyword\":\"an\",\"type\":\"customer\"}")))
                        .build();
                ToolExecutionResult executed = toolCallingManager.executeToolCalls(prompt,
                        new ChatResponse(List.of(new Generation(request))));
                return call(new Prompt(executed.conversationHistory(), prompt.getOptions()));
            }
            return new ChatResponse(List.of(new Generation(new AssistantMessage("Không có khách hàng nào tên An."))));
        }
    }

    @BeforeEach
    void setUp() {
        context = new AnnotationConfigApplicationContext();
        context.register(TransactionConfig.class);
        context.registerBean(PlatformTransactionManager.class, () -> new RecordingTransactionManager(timeline));

        for (Class<?> type : List.of(WarehouseRepository.class, InventoryBalanceRepository.class, ProductRepository.class,
                ProductVariantRepository.class, WarrantyRepository.class, RepairRepository.class,
                StockTransferRepository.class, AssemblyOrderRepository.class, PurchaseOrderRepository.class,
                SalesOrderRepository.class, InventoryDocumentRepository.class, WarehouseAccessGuard.class)) {
            registerDatabaseMock(type, Answers.RETURNS_DEFAULTS);
        }
        PartnerRepository partnerRepository = mock(PartnerRepository.class, recordDatabaseRead(Answers.RETURNS_DEFAULTS));
        doAnswer(recordDatabaseRead(invocation -> new PageImpl<>(List.of())))
                .when(partnerRepository).searchPartnersForAi(any(), anyBoolean(), anyBoolean(), any());
        context.registerBean(PartnerRepository.class, () -> partnerRepository);

        AiModelClient modelClient = mock(AiModelClient.class, invocation -> {
            timeline.add("model enhanceAnswer" + transactionState());
            return invocation.getArgument(2);
        });
        context.registerBean(AiModelClient.class, () -> modelClient);

        agentProperties = new AiAgentProperties();
        context.registerBean(AiAgentProperties.class, () -> agentProperties);
        ScriptedChatModel model = new ScriptedChatModel();
        context.registerBean(ChatModel.class, () -> model);
        context.registerBean(ChatClient.Builder.class, () -> ChatClient.builder(model));

        context.register(AiAccessPolicy.class, AiToolSupport.class, ProductTools.class, StockTools.class,
                PartnerTools.class, DocumentTools.class, AiAgentService.class, AiChatService.class);
        context.refresh();
        service = context.getBean(AiChatService.class);
        timeline.clear();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        context.close();
    }

    private <T> void registerDatabaseMock(Class<T> type, Answer<?> answer) {
        T repository = mock(type, recordDatabaseRead(answer));
        context.registerBean(type, () -> repository);
    }

    /** Repository và WarehouseAccessGuard đều đọc DB thật: ghi lại lần đọc cùng trạng thái transaction lúc đó. */
    private Answer<Object> recordDatabaseRead(Answer<?> answer) {
        return invocation -> {
            if (invocation.getMethod().getDeclaringClass() != Object.class) {
                timeline.add("db " + invocation.getMethod().getName() + transactionState());
            }
            return answer.answer(invocation);
        };
    }

    private static String transactionState() {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            return " [no tx]";
        }
        return TransactionSynchronizationManager.isCurrentTransactionReadOnly() ? " [read-only tx]" : " [read-write tx]";
    }

    private static void loginAs(String... authorities) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("tester", "x",
                Arrays.stream(authorities).map(SimpleGrantedAuthority::new).toList()));
    }

    @Test
    void classicAnswerReadsDataInAShortReadOnlyTransactionThatIsCommittedBeforeTheModelIsCalled() {
        loginAs("customer:view");

        AiChatResponse response = service.chat("Có bao nhiêu khách hàng?", List.of());

        assertEquals("CUSTOMER_COUNT", response.getIntent());
        assertEquals(List.of(
                "begin read-only tx",
                "db countCustomersForAi [read-only tx]",
                "commit",
                "model enhanceAnswer [no tx]"), timeline);
    }

    @Test
    void agentHoldsNoTransactionWhileWaitingForTheModelAndEachToolCallGetsItsOwn() {
        loginAs("customer:view");
        agentProperties.setEnabled(true);

        AiChatResponse response = service.chat("Có bao nhiêu khách hàng?", List.of());

        assertEquals("AGENT_ANSWER", response.getIntent());
        assertEquals("searchPartners", response.getSources().get(0).getName(),
                "công cụ chạy trên luồng của request: thấy SecurityContext và AiAgentRun của người hỏi");
        assertEquals(List.of(
                "model call [no tx]",
                "begin read-only tx",
                "db searchPartnersForAi [read-only tx]",
                "commit",
                "model call [no tx]"), timeline);
    }

    @ParameterizedTest
    @CsvSource({
            "Tổng quan hệ thống, ROLE_MANAGER",
            "Phiếu nhập kho gần nhất, import:view",
            "Tồn kho của kho A, warehouse_master:view",
            "Nhà cung cấp nào đang hợp tác?, supplier:view",
    })
    void everyClassicDataAnswerReadsInsideATransactionAndCallsTheModelOutsideOne(String question, String authority) {
        loginAs(authority);

        service.chat(question, List.of());

        assertTrue(timeline.stream().anyMatch(event -> event.startsWith("db ")), "câu hỏi phải đọc dữ liệu: " + timeline);
        assertEquals("model enhanceAnswer [no tx]", timeline.get(timeline.size() - 1), timeline.toString());
        assertEquals("commit", timeline.get(timeline.size() - 2), "transaction phải đóng trước khi gọi mô hình: " + timeline);
        timeline.stream().filter(event -> event.startsWith("db "))
                .forEach(event -> assertTrue(event.endsWith("[read-only tx]"), timeline.toString()));
        assertFalse(timeline.contains("rollback"), timeline.toString());
    }
}
